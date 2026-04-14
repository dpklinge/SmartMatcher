import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { computeCompatibility } from "@/lib/matching/algorithm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requesterId = session.user.id;
  const { userId: targetId } = await params;

  const [requesterAnswers, requesterPriorities, targetAnswers] = await Promise.all([
    prisma.questionnaireAnswer.findMany({ where: { userId: requesterId } }),
    prisma.answerPriority.findMany({ where: { userId: requesterId } }),
    prisma.questionnaireAnswer.findMany({ where: { userId: targetId } }),
  ]);

  const answerMap = Object.fromEntries(requesterAnswers.map((a) => [a.questionId, a.value]));
  const priorityMap = Object.fromEntries(requesterPriorities.map((p) => [p.questionId, p.importance]));
  const targetAnswerMap = Object.fromEntries(targetAnswers.map((a) => [a.questionId, a.value]));

  const result = computeCompatibility(answerMap, priorityMap, targetAnswerMap);

  // Update cache
  await prisma.compatibilityCache.upsert({
    where: { requesterId_targetId: { requesterId, targetId } },
    update: { score: result.score, breakdown: JSON.stringify(result.categoryBreakdown), computedAt: new Date() },
    create: { requesterId, targetId, score: result.score, breakdown: JSON.stringify(result.categoryBreakdown) },
  });

  return NextResponse.json(result);
}
