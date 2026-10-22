import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { getPairCompatibility } from "@/lib/matching/service";
import { profilesAreMutuallyEligible } from "@/lib/matching/eligibility";
import { answerMap, missingRequiredAnswers } from "@/lib/questionnaire/answers";
import { captureMatchBaselines } from "@/lib/research/service";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetId, direction } = await req.json().catch(() => ({}));
  if (typeof targetId !== "string" || !targetId || targetId === session.user.id || !["LIKE", "PASS"].includes(direction)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const actorId = session.user.id;

  let pairScore = 0;
  if (direction === "LIKE") {
    const users = await prisma.user.findMany({ where: { id: { in: [actorId, targetId] } }, include: { profile: true, answers: true } });
    const a = users.find(u => u.id === actorId), b = users.find(u => u.id === targetId);
    const pair = await getPairCompatibility(actorId, targetId);
    if (!a || !b || a.onboardingStep !== "COMPLETE" || b.onboardingStep !== "COMPLETE"
      || !profilesAreMutuallyEligible(a.profile, b.profile)
      || missingRequiredAnswers(answerMap(a.answers)).length || missingRequiredAnswers(answerMap(b.answers)).length
      || pair?.eligibility !== "ELIGIBLE") {
      return NextResponse.json({ error: "This introduction is no longer available. Refresh your matches." }, { status: 409 });
    }
    pairScore = pair.score;
  }
  // Record swipe (upsert in case of re-swipe)
  await prisma.swipe.upsert({
    where: { actorId_targetId: { actorId, targetId } },
    update: { direction },
    create: { actorId, targetId, direction },
  });

  let matched = false;
  let matchScore = 0;

  if (direction === "LIKE") {
    // Check if target already liked actor
    const reciprocal = await prisma.swipe.findUnique({
      where: { actorId_targetId: { actorId: targetId, targetId: actorId } },
    });

    if (reciprocal?.direction === "LIKE") {
      matchScore = pairScore;

      const [u1, u2] = [actorId, targetId].sort();
      await prisma.$transaction(async tx => {
        const where = { user1Id_user2Id: { user1Id: u1, user2Id: u2 } };
        const existing = await tx.match.findUnique({ where });
        const match = await tx.match.upsert({ where, update: { score: matchScore },
          create: { user1Id: u1, user2Id: u2, score: matchScore } });
        if (!existing) await captureMatchBaselines(tx, match);
      });
      matched = true;
    }
  }

  return NextResponse.json({ matched, matchScore: Math.round(matchScore * 100) });
}
