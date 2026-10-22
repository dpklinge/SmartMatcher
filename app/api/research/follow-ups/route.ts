import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { CONSENT_VERSION, addMonths } from "@/lib/research/contracts";
import { feedbackSchema } from "@/lib/research/validation";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = feedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid check-in." }, { status: 400 });
  const userId = session.user.id;
  const input = parsed.data;
  const result = await prisma.$transaction(async tx => {
    const consent = await tx.researchConsent.findUnique({ where: { userId } });
    if (!consent?.enabled || consent.policyVersion !== CONSENT_VERSION) return { error: "Opt in before submitting a check-in.", status: 403 };
    const match = await tx.match.findFirst({ where: { id: input.matchId, OR: [{ user1Id: userId }, { user2Id: userId }] } });
    if (!match) return { error: "Match not found.", status: 404 };
    const start = input.relationshipStartedAt ? new Date(input.relationshipStartedAt) : null;
    if (input.stage !== "AFTER_MEETING") {
      const months = Number(input.stage.split("_")[1]);
      if (!start || addMonths(start, months) > new Date()) return { error: "This relationship checkpoint is not due yet.", status: 400 };
    }
    const data = { status: input.status, metAt: input.metAt ? new Date(input.metAt) : null,
      relationshipStartedAt: start, satisfaction: input.satisfaction, respect: input.respect,
      wantsToContinue: input.wantsToContinue, reportedAt: new Date() };
    await tx.relationshipFeedback.upsert({ where: { userId_matchId_stage: { userId, matchId: input.matchId, stage: input.stage } },
      update: data, create: { userId, matchId: input.matchId, stage: input.stage, ...data } });
    return null;
  });
  return result ? NextResponse.json({ error: result.error }, { status: result.status }) : NextResponse.json({ success: true });
}
