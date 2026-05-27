import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: { participants: { where: { status: "APPROVED" } } },
  });

  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (activity.creatorId === userId) {
    return NextResponse.json({ error: "You created this activity" }, { status: 400 });
  }
  if (new Date(activity.dateTime) < new Date()) {
    return NextResponse.json({ error: "Activity has already passed" }, { status: 400 });
  }
  if (activity.participants.length >= activity.maxPeople) {
    return NextResponse.json({ error: "Activity is full" }, { status: 400 });
  }

  const existing = await prisma.activityParticipant.findUnique({
    where: { activityId_userId: { activityId: id, userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already joined or pending" }, { status: 400 });
  }

  const status = activity.isOpen ? "APPROVED" : "PENDING";
  const participant = await prisma.activityParticipant.create({
    data: { activityId: id, userId, status },
  });

  return NextResponse.json({ status: participant.status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (activity?.creatorId === userId) {
    return NextResponse.json({ error: "Creator cannot leave their own activity" }, { status: 400 });
  }

  await prisma.activityParticipant
    .delete({ where: { activityId_userId: { activityId: id, userId } } })
    .catch(() => {});

  return NextResponse.json({ success: true });
}
