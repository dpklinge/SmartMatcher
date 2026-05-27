import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { computeCompatibility } from "@/lib/matching/algorithm";
import { calculateAge } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requesterId = session.user.id;
  const { userId: targetId } = await params;

  const [target, requesterAnswers, requesterPriorities, targetAnswers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetId },
      include: { profile: { include: { photos: { orderBy: { order: "asc" }, take: 1 } } } },
    }),
    prisma.questionnaireAnswer.findMany({ where: { userId: requesterId } }),
    prisma.answerPriority.findMany({ where: { userId: requesterId } }),
    prisma.questionnaireAnswer.findMany({ where: { userId: targetId } }),
  ]);

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const answerMap = Object.fromEntries(requesterAnswers.map((a) => [a.questionId, a.value]));
  const priorityMap = Object.fromEntries(requesterPriorities.map((p) => [p.questionId, p.importance]));
  const targetAnswerMap = Object.fromEntries(targetAnswers.map((a) => [a.questionId, a.value]));

  const result = computeCompatibility(answerMap, priorityMap, targetAnswerMap);

  const profile = {
    id: target.id,
    name: target.name,
    age: target.profile?.birthDate ? calculateAge(target.profile.birthDate) : null,
    bio: target.profile?.bio ?? null,
    occupation: target.profile?.occupation ?? null,
    location: target.profile?.location ?? null,
    education: target.profile?.education ?? null,
    photoUrl: target.profile?.photos?.[0]?.url ?? target.image ?? null,
    compatibility: {
      score: result.score,
      percentage: result.percentage,
      categoryBreakdown: Object.fromEntries(
        Object.entries(result.categoryBreakdown).map(([k, v]) => [k, Math.round((v as number) * 100)])
      ),
      alignedPriorities: result.alignedPriorities.map((p) => p.questionText),
    },
  };

  return NextResponse.json({ profile });
}
