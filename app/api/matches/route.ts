import { NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: import("next/server").NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const matches = await prisma.match.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { include: { profile: { include: { photos: { orderBy: { order: "asc" }, take: 1 } } } } },
      user2: { include: { profile: { include: { photos: { orderBy: { order: "asc" }, take: 1 } } } } },
    },
    orderBy: { matchedAt: "desc" },
  });

  const formatted = matches.map((m) => {
    const other = m.user1Id === userId ? m.user2 : m.user1;
    return {
      matchId: m.id,
      matchedAt: m.matchedAt,
      score: Math.round(m.score * 100),
      user: {
        id: other.id,
        name: other.name,
        image: other.image,
        profile: other.profile,
      },
    };
  });

  return NextResponse.json({ matches: formatted });
}
