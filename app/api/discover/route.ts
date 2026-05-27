import { NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { computeCompatibility } from "@/lib/matching/algorithm";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: import("next/server").NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Fetch current user data
  const [currentUser, requesterAnswers, requesterPriorities] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
    prisma.questionnaireAnswer.findMany({ where: { userId } }),
    prisma.answerPriority.findMany({ where: { userId } }),
  ]);

  const answerMap = Object.fromEntries(requesterAnswers.map((a) => [a.questionId, a.value]));
  const priorityMap = Object.fromEntries(requesterPriorities.map((p) => [p.questionId, p.importance]));

  // Find already-swiped users
  const swiped = await prisma.swipe.findMany({ where: { actorId: userId }, select: { targetId: true } });
  const swipedIds = swiped.map((s) => s.targetId);

  // Fetch candidates
  const seeking = currentUser?.profile?.seeking;
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: userId, notIn: swipedIds },
      onboardingStep: "COMPLETE",
      ...(seeking && seeking !== "everyone"
        ? { profile: { is: { gender: seeking === "men" ? "male" : "female" } } }
        : {}),
    },
    include: {
      profile: { include: { photos: { orderBy: { order: "asc" }, take: 3 } } },
      answers: true,
    },
    take: 50,
  });

  // Location filter — only applied when the current user has coordinates stored
  const userLat = currentUser?.profile?.latitude;
  const userLon = currentUser?.profile?.longitude;
  const searchRadius = currentUser?.profile?.searchRadius ?? 50;

  const locationFiltered = (userLat != null && userLon != null)
    ? candidates.filter((c) => {
        const cLat = c.profile?.latitude;
        const cLon = c.profile?.longitude;
        // Candidates without coordinates are included (they haven't set location yet)
        if (cLat == null || cLon == null) return true;
        return haversineKm(userLat, userLon, cLat, cLon) <= searchRadius;
      })
    : candidates;

  // Score candidates
  const scored = await Promise.all(
    locationFiltered.map(async (candidate) => {
      // Check cache
      const cached = await prisma.compatibilityCache.findUnique({
        where: { requesterId_targetId: { requesterId: userId, targetId: candidate.id } },
      });

      let compatibility;
      if (cached && cached.computedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        compatibility = { score: cached.score, breakdown: JSON.parse(cached.breakdown) };
      } else {
        const targetAnswerMap = Object.fromEntries(candidate.answers.map((a) => [a.questionId, a.value]));
        const result = computeCompatibility(answerMap, priorityMap, targetAnswerMap);

        await prisma.compatibilityCache.upsert({
          where: { requesterId_targetId: { requesterId: userId, targetId: candidate.id } },
          update: { score: result.score, breakdown: JSON.stringify(result.categoryBreakdown), computedAt: new Date() },
          create: { requesterId: userId, targetId: candidate.id, score: result.score, breakdown: JSON.stringify(result.categoryBreakdown) },
        });

        compatibility = { score: result.score, breakdown: result.categoryBreakdown };
      }

      return {
        id: candidate.id,
        name: candidate.name,
        image: candidate.image,
        profile: candidate.profile,
        compatibility: {
          score: compatibility.score,
          percentage: Math.round(compatibility.score * 100),
          breakdown: Object.fromEntries(
            Object.entries(compatibility.breakdown as Record<string, number>).map(
              ([k, v]) => [k, Math.round(v * 100)]
            )
          ),
        },
      };
    })
  );

  // Sort by compatibility score
  scored.sort((a, b) => b.compatibility.score - a.compatibility.score);

  return NextResponse.json({ candidates: scored.slice(0, 20) });
}
