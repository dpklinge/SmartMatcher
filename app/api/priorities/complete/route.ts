import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { answerMap, missingRequiredAnswers } from "@/lib/questionnaire/answers";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const missing = missingRequiredAnswers(answerMap(await prisma.questionnaireAnswer.findMany({ where: { userId } })));
  if (missing.length) return NextResponse.json({ error: "Complete the required relationship questions first.", missing }, { status: 400 });
  await prisma.user.updateMany({ where: { id: userId, onboardingStep: { in: ["QUESTIONNAIRE", "PRIORITIES"] } }, data: { onboardingStep: "COMPLETE" } });
  return NextResponse.json({ success: true, nextStep: "COMPLETE" });
}
