import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { QUESTIONS, QUESTIONNAIRE_VERSION } from "@/lib/questionnaire/questions";
import { answerMap, validateAnswerPayload } from "@/lib/questionnaire/answers";
import { registerQuestion } from "@/lib/questionnaire/persistence";
import { recomputeMatchScores } from "@/lib/matching/recompute-matches";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.questionnaireAnswer.findMany({ where: { userId: session.user.id } });
  const current = new Set(QUESTIONS.map(q => q.id));
  // Return typed current-version answers; historical answers remain stored unchanged.
  return NextResponse.json({ version: QUESTIONNAIRE_VERSION, questions: QUESTIONS,
    answers: answerMap(rows.filter(row => current.has(row.questionId))) });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.version !== QUESTIONNAIRE_VERSION) return NextResponse.json({ error: "Reload the current questionnaire." }, { status: 409 });
  const error = validateAnswerPayload(body?.answers);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const userId = session.user.id;
  await prisma.$transaction(async tx => {
    for (const [questionId, value] of Object.entries(body.answers as Record<string, unknown>)) {
      await registerQuestion(tx, QUESTIONS.find(q => q.id === questionId)!);
      await tx.questionnaireAnswer.upsert({ where: { userId_questionId: { userId, questionId } },
        update: { value: JSON.stringify(value) }, create: { userId, questionId, value: JSON.stringify(value) } });
    }
    await tx.compatibilityCache.deleteMany({ where: { OR: [{ requesterId: userId }, { targetId: userId }] } });
  });
  await recomputeMatchScores(userId);
  return NextResponse.json({ success: true });
}
