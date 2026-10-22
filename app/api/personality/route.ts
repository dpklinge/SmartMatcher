import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { PERSONALITY_VERSION, PERSONALITY_ITEMS, PERSONALITY_ANCHORS, validPersonalityAnswers, personalityScores } from "@/lib/questionnaire/personality";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await prisma.personalityAssessment.findUnique({ where: { userId: session.user.id } });
  const answers = row?.instrumentVersion === PERSONALITY_VERSION ? JSON.parse(row.answersJson) : null;
  return NextResponse.json({ version: PERSONALITY_VERSION, items: PERSONALITY_ITEMS, anchors: PERSONALITY_ANCHORS,
    answers, scores: answers ? personalityScores(answers) : null }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (body?.version !== PERSONALITY_VERSION || !validPersonalityAnswers(body?.answers)) {
    return NextResponse.json({ error: "Complete all 20 items using the five response options." }, { status: 400 });
  }
  const data = { instrumentVersion: PERSONALITY_VERSION, answersJson: JSON.stringify(body.answers) };
  await prisma.personalityAssessment.upsert({ where: { userId: session.user.id }, update: data, create: { userId: session.user.id, ...data } });
  return NextResponse.json({ scores: personalityScores(body.answers) });
}
export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.$transaction(async tx => {
    await tx.personalityAssessment.deleteMany({ where: { userId: session.user.id } });
    await tx.matchBaseline.updateMany({ where: { userId: session.user.id }, data: { personalityJson: null } });
  });
  return NextResponse.json({ success: true });
}
