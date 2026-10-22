import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { computeCompatibility } from "@/lib/matching/algorithm";
import { profilesAreMutuallyEligible } from "@/lib/matching/eligibility";
import { answerMap, missingRequiredAnswers } from "@/lib/questionnaire/answers";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const current = await prisma.user.findUnique({ where: { id: userId },
    include: { profile: true, answers: true, priorities: true } });
  if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const mine = answerMap(current.answers);
  if (missingRequiredAnswers(mine).length) {
    return NextResponse.json({ candidates: [], needsQuestionnaire: true });
  }
  const myPriorities = Object.fromEntries(current.priorities.map(p => [p.questionId, p.importance]));
  const swipes = await prisma.swipe.findMany({ where: { actorId: userId }, select: { targetId: true } });
  const excluded = [userId, ...swipes.map(s => s.targetId)];
  const scored = [];
  let cursor: string | undefined;
  // Scan the eligible pool in bounded batches; do not rank an arbitrary first 50 people.
  do {
    const candidates = await prisma.user.findMany({
      where: { id: { notIn: excluded }, onboardingStep: "COMPLETE" },
      include: { profile: { include: { photos: { orderBy: { order: "asc" }, take: 3 } } }, answers: true, priorities: true },
      orderBy: { id: "asc" }, take: 200, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const c of candidates) {
      if (!profilesAreMutuallyEligible(current.profile, c.profile)) continue;
      const theirs = answerMap(c.answers);
      if (missingRequiredAnswers(theirs).length) continue;
      const result = computeCompatibility(mine, myPriorities, theirs,
        Object.fromEntries(c.priorities.map(p => [p.questionId, p.importance])));
      if (result.eligibility !== "ELIGIBLE") continue;
      scored.push({ id: c.id, name: c.name, image: c.image, profile: c.profile,
        compatibility: { score: result.score, percentage: result.percentage, coverage: result.coverage, categoryCoverage: result.categoryCoverage,
          breakdown: Object.fromEntries(Object.entries(result.categoryBreakdown).map(([k, v]) => [k, Math.round(v * 100)])) } });
    }
    scored.sort((a, b) => (b.compatibility.score * b.compatibility.coverage) - (a.compatibility.score * a.compatibility.coverage)
      || b.compatibility.coverage - a.compatibility.coverage || a.id.localeCompare(b.id));
    scored.splice(20);
    cursor = candidates.length === 200 ? candidates[candidates.length - 1].id : undefined;
  } while (cursor);
  return NextResponse.json({ candidates: scored, needsQuestionnaire: false });
}
