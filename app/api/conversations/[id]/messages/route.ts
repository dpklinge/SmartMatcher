import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

const LIMIT = 40;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv || (conv.user1Id !== userId && conv.user2Id !== userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    include: {
      linkedActivity: {
        select: {
          id: true,
          title: true,
          placeName: true,
          dateTime: true,
          priceMin: true,
          priceMax: true,
          maxPeople: true,
          isOpen: true,
          creatorId: true,
          participants: {
            select: { userId: true, status: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > LIMIT;
  if (hasMore) messages.pop();

  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      linkedActivity: m.linkedActivity
        ? {
            id: m.linkedActivity.id,
            title: m.linkedActivity.title,
            placeName: m.linkedActivity.placeName,
            dateTime: m.linkedActivity.dateTime.toISOString(),
            priceMin: m.linkedActivity.priceMin,
            priceMax: m.linkedActivity.priceMax,
            maxPeople: m.linkedActivity.maxPeople,
            isOpen: m.linkedActivity.isOpen,
            isCreatedByMe: m.linkedActivity.creatorId === userId,
            myStatus:
              m.linkedActivity.participants.find((p) => p.userId === userId)?.status ?? null,
            participantCount: m.linkedActivity.participants.filter(
              (p) => p.status === "APPROVED"
            ).length,
          }
        : null,
    })),
    nextCursor: hasMore ? messages[messages.length - 1].id : null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv || (conv.user1Id !== userId && conv.user2Id !== userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { body, linkedActivityId } = await req.json();

  if (!body?.trim()) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }

  if (linkedActivityId) {
    const activity = await prisma.activity.findUnique({ where: { id: linkedActivityId } });
    if (!activity || activity.creatorId !== userId) {
      return NextResponse.json(
        { error: "You can only link activities you created" },
        { status: 400 }
      );
    }
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        body: body.trim(),
        ...(linkedActivityId ? { linkedActivityId } : {}),
      },
    }),
    prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  return NextResponse.json({ messageId: message.id }, { status: 201 });
}
