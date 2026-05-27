import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // 1. Matches
  const matches = await prisma.match.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: { id: true, name: true, image: true } },
      user2: { select: { id: true, name: true, image: true } },
    },
  });

  const matchedUsers = matches.map((m) =>
    m.user1Id === userId ? m.user2 : m.user1
  );
  const matchedIds = new Set(matchedUsers.map((u) => u.id));

  // 2. Creators of activities I participate in (who aren't already a match)
  const creatorRows = await prisma.activity.findMany({
    where: {
      participants: { some: { userId } },
      creatorId: { not: userId },
    },
    select: { creatorId: true },
    distinct: ["creatorId"],
  });

  const creatorIds = creatorRows
    .map((r) => r.creatorId)
    .filter((id): id is string => id !== null && !matchedIds.has(id));

  const activityCreators =
    creatorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true, image: true },
        })
      : [];

  // 3. Participants of activities I created (who aren't already a match or creator above)
  const seenIds = new Set([...matchedIds, ...creatorIds]);

  const participantRows = await prisma.activityParticipant.findMany({
    where: {
      activity: { creatorId: userId },
      userId: { not: userId },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  const participantIds = participantRows
    .map((r) => r.userId)
    .filter((id) => !seenIds.has(id));

  const activityParticipants =
    participantIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: participantIds } },
          select: { id: true, name: true, image: true },
        })
      : [];

  return NextResponse.json({
    contacts: [
      ...matchedUsers.map((u) => ({ ...u, connectionType: "match" as const })),
      ...activityCreators.map((u) => ({ ...u, connectionType: "activity" as const })),
      ...activityParticipants.map((u) => ({ ...u, connectionType: "activity" as const })),
    ],
  });
}
