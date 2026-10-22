import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { recomputeMatchScores } from "@/lib/matching/recompute-matches";
import { PREFERENCE_QUESTIONS, QUESTIONNAIRE_VERSION } from "@/lib/questionnaire/questions";
import { answerMap, missingRequiredAnswers } from "@/lib/questionnaire/answers";
import { registerQuestion } from "@/lib/questionnaire/persistence";
import { WEIGHT_MAP } from "@/lib/matching/weights";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.answerPriority.findMany({ where: { userId: session.user.id } });
  const ids = new Set(PREFERENCE_QUESTIONS.map(q => q.id));
  return NextResponse.json({ version: QUESTIONNAIRE_VERSION,
    priorities: Object.fromEntries(rows.filter(p => ids.has(p.questionId)).map(p => [p.questionId, p.importance])) });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.version !== QUESTIONNAIRE_VERSION) return NextResponse.json({ error: "Reload the current questionnaire." }, { status: 409 });
  const priorities = body?.priorities;
  if (!priorities || typeof priorities !== "object" || Array.isArray(priorities)
    || Object.entries(priorities).some(([id, importance]) => !PREFERENCE_QUESTIONS.some(q => q.id === id)
      || typeof importance !== "string" || !Object.hasOwn(WEIGHT_MAP, importance))) {
    return NextResponse.json({ error: "Invalid priorities." }, { status: 400 });
  }
  const userId = session.user.id;
  const missing = missingRequiredAnswers(answerMap(await prisma.questionnaireAnswer.findMany({ where: { userId } })));
  if (missing.length) return NextResponse.json({ error: "Complete the required relationship questions first.", missing }, { status: 400 });
  await prisma.$transaction(async tx => {
    for (const [questionId, importance] of Object.entries(priorities as Record<string, string>)) {
      await registerQuestion(tx, PREFERENCE_QUESTIONS.find(q => q.id === questionId)!);
      await tx.answerPriority.upsert({ where: { userId_questionId: { userId, questionId } },
        update: { importance }, create: { userId, questionId, importance } });
    }
    await tx.user.updateMany({ where: { id: userId, onboardingStep: { in: ["QUESTIONNAIRE", "PRIORITIES"] } }, data: { onboardingStep: "COMPLETE" } });
    await tx.compatibilityCache.deleteMany({ where: { OR: [{ requesterId: userId }, { targetId: userId }] } });
  });
  await recomputeMatchScores(userId);
  return NextResponse.json({ success: true });
}
