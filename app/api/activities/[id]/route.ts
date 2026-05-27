import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id;

  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, image: true } },
      participants: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCreator = activity.creatorId === userId;
  const myStatus = activity.participants.find((p) => p.userId === userId)?.status ?? null;

  // Non-creators see only approved participants (plus their own record regardless of status)
  const visibleParticipants = isCreator
    ? activity.participants
    : activity.participants.filter((p) => p.status === "APPROVED" || p.userId === userId);

  return NextResponse.json({
    activity: {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      placeName: activity.placeName,
      placeAddress: activity.placeAddress,
      dateTime: activity.dateTime.toISOString(),
      priceMin: activity.priceMin,
      priceMax: activity.priceMax,
      maxPeople: activity.maxPeople,
      isOpen: activity.isOpen,
      isSponsored: activity.isSponsored,
      sponsorName: activity.sponsorName,
      creator: activity.creator,
      isCreator,
      myStatus,
      participantCount: activity.participants.filter((p) => p.status === "APPROVED").length,
      pendingCount: activity.participants.filter((p) => p.status === "PENDING").length,
      participants: visibleParticipants.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        image: p.user.image,
        status: p.status,
        joinedAt: p.joinedAt.toISOString(),
      })),
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (activity.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.activity.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
