import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

async function canMessage(userId: string, otherId: string): Promise<boolean> {
  if (userId === otherId) return false;

  const match = await prisma.match.findFirst({
    where: {
      OR: [
        { user1Id: userId, user2Id: otherId },
        { user1Id: otherId, user2Id: userId },
      ],
    },
  });
  if (match) return true;

  const link = await prisma.activity.findFirst({
    where: {
      OR: [
        { creatorId: userId, participants: { some: { userId: otherId } } },
        { creatorId: otherId, participants: { some: { userId } } },
      ],
    },
  });
  return !!link;
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: { id: true, name: true, image: true } },
      user2: { select: { id: true, name: true, image: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, senderId: true, body: true, createdAt: true, readAt: true },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  const unreadGroups = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversation: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      senderId: { not: userId },
      readAt: null,
    },
    _count: { id: true },
  });
  const unreadMap = Object.fromEntries(unreadGroups.map((g) => [g.conversationId, g._count.id]));

  return NextResponse.json({
    conversations: conversations.map((c) => {
      const other = c.user1Id === userId ? c.user2 : c.user1;
      const last = c.messages[0] ?? null;
      return {
        id: c.id,
        other,
        lastMessage: last
          ? {
              body: last.body,
              senderId: last.senderId,
              createdAt: last.createdAt.toISOString(),
              isRead: last.readAt !== null || last.senderId === userId,
            }
          : null,
        unreadCount: unreadMap[c.id] ?? 0,
        lastMessageAt: c.lastMessageAt.toISOString(),
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { otherId } = await req.json();

  if (!otherId || typeof otherId !== "string") {
    return NextResponse.json({ error: "otherId required" }, { status: 400 });
  }

  if (!(await canMessage(userId, otherId))) {
    return NextResponse.json(
      { error: "You can only message matches or activity connections" },
      { status: 403 }
    );
  }

  const [user1Id, user2Id] = userId < otherId ? [userId, otherId] : [otherId, userId];

  const conversation = await prisma.conversation.upsert({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    create: { user1Id, user2Id },
    update: {},
  });

  return NextResponse.json({ conversationId: conversation.id });
}
