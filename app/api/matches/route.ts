import { NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: import("next/server").NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [matchRows, likeSwipes] = await Promise.all([
    prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { include: { profile: { include: { photos: { orderBy: { order: "asc" }, take: 1 } } } } },
        user2: { include: { profile: { include: { photos: { orderBy: { order: "asc" }, take: 1 } } } } },
      },
      orderBy: { matchedAt: "desc" },
    }),
    prisma.swipe.findMany({
      where: { actorId: userId, direction: "LIKE" },
      include: {
        target: { include: { profile: { include: { photos: { orderBy: { order: "asc" }, take: 1 } } } } },
      },
      orderBy: { swipedAt: "desc" },
    }),
  ]);

  const matchedUserIds = new Set(
    matchRows.map((m) => (m.user1Id === userId ? m.user2Id : m.user1Id))
  );

  const pendingLikeRows = likeSwipes.filter((s) => !matchedUserIds.has(s.targetId));

  // Batch-fetch cached compatibility scores for pending likes
  const pendingTargetIds = pendingLikeRows.map((s) => s.targetId);
  const cacheEntries = pendingTargetIds.length > 0
    ? await prisma.compatibilityCache.findMany({
        where: { requesterId: userId, targetId: { in: pendingTargetIds } },
      })
    : [];
  const cacheMap = Object.fromEntries(cacheEntries.map((c) => [c.targetId, c.score]));

  const matches = matchRows.map((m) => {
    const other = m.user1Id === userId ? m.user2 : m.user1;
    return {
      matchId: m.id,
      matchedAt: m.matchedAt,
      score: Math.round(m.score * 100),
      user: { id: other.id, name: other.name, image: other.image, profile: other.profile },
    };
  });

  const pendingLikes = pendingLikeRows.map((s) => ({
    swipeId: s.id,
    likedAt: s.swipedAt,
    score: Math.round((cacheMap[s.targetId] ?? 0) * 100),
    user: { id: s.target.id, name: s.target.name, image: s.target.image, profile: s.target.profile },
  }));

  return NextResponse.json({ matches, pendingLikes });
}
