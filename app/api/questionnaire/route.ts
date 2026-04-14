import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { QUESTIONS } from "@/lib/questionnaire/questions";

export async function GET(req: import("next/server").NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existingAnswers = await prisma.questionnaireAnswer.findMany({
    where: { userId: session.user.id },
  });

  const answerMap = Object.fromEntries(existingAnswers.map((a) => [a.questionId, a.value]));

  return NextResponse.json({ questions: QUESTIONS, answers: answerMap });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { answers }: { answers: Record<string, unknown> } = await req.json();
  if (!answers) return NextResponse.json({ error: "Answers required" }, { status: 400 });

  const upserts = Object.entries(answers).map(([questionId, value]) =>
    prisma.questionnaireAnswer.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      update: { value: JSON.stringify(value), updatedAt: new Date() },
      create: { userId: session.user.id, questionId, value: JSON.stringify(value) },
    })
  );

  await prisma.$transaction(upserts);

  // Advance onboardingStep from QUESTIONNAIRE → PRIORITIES (no-op if already past it)
  await prisma.user.updateMany({
    where: { id: session.user.id, onboardingStep: "QUESTIONNAIRE" },
    data: { onboardingStep: "PRIORITIES" },
  });

  // Invalidate compatibility cache
  await prisma.compatibilityCache.deleteMany({ where: { requesterId: session.user.id } });

  return NextResponse.json({ success: true });
}
