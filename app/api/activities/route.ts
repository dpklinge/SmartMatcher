import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "1";
  const created = searchParams.get("created") === "1";

  const where = created
    ? { creatorId: userId }
    : mine
      ? { participants: { some: { userId } } }
      : { dateTime: { gte: new Date() } };

  const activities = await prisma.activity.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, image: true } },
      participants: { select: { userId: true, status: true } },
    },
    orderBy: { dateTime: "asc" },
    take: 100,
  });

  return NextResponse.json({
    activities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      placeName: a.placeName,
      placeAddress: a.placeAddress,
      dateTime: a.dateTime.toISOString(),
      priceMin: a.priceMin,
      priceMax: a.priceMax,
      maxPeople: a.maxPeople,
      isOpen: a.isOpen,
      isSponsored: a.isSponsored,
      sponsorName: a.sponsorName,
      creator: a.creator,
      isCreator: a.creatorId === userId,
      participantCount: a.participants.filter((p) => p.status === "APPROVED").length,
      myStatus: a.participants.find((p) => p.userId === userId)?.status ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, placeName, placeAddress, dateTime, priceMin, priceMax, maxPeople, isOpen } = body;

  if (!title || !placeName || !placeAddress || !dateTime || maxPeople == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const activity = await prisma.activity.create({
    data: {
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      placeName: String(placeName).trim(),
      placeAddress: String(placeAddress).trim(),
      dateTime: new Date(dateTime),
      priceMin: Number(priceMin ?? 0),
      priceMax: priceMax != null ? Number(priceMax) : null,
      maxPeople: Math.max(1, parseInt(String(maxPeople))),
      isOpen: isOpen !== false,
      creatorId: session.user.id,
    },
  });

  // Creator automatically joins as an approved participant
  await prisma.activityParticipant.create({
    data: { activityId: activity.id, userId: session.user.id, status: "APPROVED" },
  });

  return NextResponse.json({ activity }, { status: 201 });
}
