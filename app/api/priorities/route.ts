import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: import("next/server").NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const priorities = await prisma.answerPriority.findMany({
    where: { userId: session.user.id },
  });

  const priorityMap = Object.fromEntries(priorities.map((p) => [p.questionId, p.importance]));
  return NextResponse.json({ priorities: priorityMap });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { priorities }: { priorities: Record<string, string> } = await req.json();
  if (!priorities) return NextResponse.json({ error: "Priorities required" }, { status: 400 });

  const upserts = Object.entries(priorities).map(([questionId, importance]) =>
    prisma.answerPriority.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      update: { importance, updatedAt: new Date() },
      create: { userId: session.user.id, questionId, importance },
    })
  );

  await prisma.$transaction(upserts);

  // Advance onboardingStep to COMPLETE (no-op if already there)
  await prisma.user.updateMany({
    where: { id: session.user.id, onboardingStep: { in: ["QUESTIONNAIRE", "PRIORITIES"] } },
    data: { onboardingStep: "COMPLETE" },
  });

  // Invalidate compatibility cache
  await prisma.compatibilityCache.deleteMany({ where: { requesterId: session.user.id } });

  return NextResponse.json({ success: true });
}
