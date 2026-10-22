import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const [consent, baselines, feedback] = await Promise.all([
    prisma.researchConsent.findUnique({ where: { userId } }),
    prisma.matchBaseline.findMany({ where: { userId } }),
    prisma.relationshipFeedback.findMany({ where: { userId } }),
  ]);
  return NextResponse.json({ exportedAt: new Date(), consent, baselines: baselines.map(b => ({
    matchId: b.matchId, capturedAt: b.capturedAt, questionnaireVersion: b.questionnaireVersion,
    scoringVersion: b.scoringVersion, answers: JSON.parse(b.answersJson), priorities: JSON.parse(b.prioritiesJson),
    personality: b.personalityJson ? JSON.parse(b.personalityJson) : null,
  })), feedback }, { headers: { "Cache-Control": "no-store", "Content-Disposition": "attachment; filename=relationship-check-ins.json" } });
}
