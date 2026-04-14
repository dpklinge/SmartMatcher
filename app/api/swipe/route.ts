import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetId, direction } = await req.json();
  if (!targetId || !["LIKE", "PASS"].includes(direction)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const actorId = session.user.id;

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
      // Get cached compatibility score
      const cache = await prisma.compatibilityCache.findUnique({
        where: { requesterId_targetId: { requesterId: actorId, targetId } },
      });
      matchScore = cache?.score ?? 0;

      const [u1, u2] = [actorId, targetId].sort();
      await prisma.match.upsert({
        where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
        update: {},
        create: { user1Id: u1, user2Id: u2, score: matchScore },
      });
      matched = true;
    }
  }

  return NextResponse.json({ matched, matchScore: Math.round(matchScore * 100) });
}
