import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, bio, birthDate, gender, seeking, location, occupation, education, height } = body;

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    update: { bio, birthDate: birthDate ? new Date(birthDate) : undefined, gender, seeking, location, occupation, education, height },
    create: { userId: session.user.id, bio, birthDate: birthDate ? new Date(birthDate) : undefined, gender, seeking, location, occupation, education, height },
  });

  if (name) {
    await prisma.user.update({ where: { id: session.user.id }, data: { name } });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: "QUESTIONNAIRE" },
  });

  return NextResponse.json({ success: true, nextStep: "QUESTIONNAIRE" });
}
