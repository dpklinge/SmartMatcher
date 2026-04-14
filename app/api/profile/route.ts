import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: import("next/server").NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: { photos: { orderBy: { order: "asc" } } },
  });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true, onboardingStep: true, twoFactorEnabled: true, phoneNumber: true },
  });

  return NextResponse.json({ profile, user });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, bio, birthDate, gender, seeking, location, occupation, education, height, photos,
          latitude, longitude, searchRadius } = body;

  const updateData: Record<string, unknown> = {};
  if (bio !== undefined) updateData.bio = bio;
  if (birthDate !== undefined) updateData.birthDate = new Date(birthDate);
  if (gender !== undefined) updateData.gender = gender;
  if (seeking !== undefined) updateData.seeking = seeking;
  if (location !== undefined) updateData.location = location;
  if (occupation !== undefined) updateData.occupation = occupation;
  if (education !== undefined) updateData.education = education;
  if (height !== undefined) updateData.height = height;
  if (latitude !== undefined) updateData.latitude = latitude;
  if (longitude !== undefined) updateData.longitude = longitude;
  if (searchRadius !== undefined) updateData.searchRadius = searchRadius;

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    update: updateData,
    create: { userId: session.user.id, ...updateData },
  });

  if (name) {
    await prisma.user.update({ where: { id: session.user.id }, data: { name } });
  }

  // Replace photos if provided
  if (photos && Array.isArray(photos)) {
    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
    if (profile) {
      await prisma.profilePhoto.deleteMany({ where: { profileId: profile.id } });
      await prisma.profilePhoto.createMany({
        data: photos.map((url: string, i: number) => ({ profileId: profile.id, url, order: i })),
      });
    }
  }

  return NextResponse.json({ success: true });
}
