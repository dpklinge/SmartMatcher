import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { CONSENT_VERSION, checkpoints } from "@/lib/research/contracts";
import { eraseResearchData } from "@/lib/research/service";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const consent = await prisma.researchConsent.findUnique({ where: { userId } });
  const enabled = !!consent?.enabled && consent.policyVersion === CONSENT_VERSION;
  const matches = enabled ? await prisma.match.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: { user1: { select: { name: true } }, user2: { select: { name: true } },
      feedback: { where: { userId }, orderBy: { reportedAt: "asc" } } }, orderBy: { matchedAt: "desc" },
  }) : [];
  return NextResponse.json({ consent: { enabled, policyVersion: CONSENT_VERSION }, matches: matches.map(m => ({
    id: m.id, name: (m.user1Id === userId ? m.user2.name : m.user1.name) ?? "Your match",
    reports: m.feedback.map(r => ({ matchId: r.matchId, stage: r.stage, status: r.status, metAt: r.metAt,
      relationshipStartedAt: r.relationshipStartedAt, satisfaction: r.satisfaction, respect: r.respect,
      wantsToContinue: r.wantsToContinue, reportedAt: r.reportedAt })), checkpoints: checkpoints(m.feedback),
  })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean" || body.policyVersion !== CONSENT_VERSION) {
    return NextResponse.json({ error: "Review the current participation information first." }, { status: 400 });
  }
  const userId = session.user.id;
  await prisma.$transaction(async tx => {
    const data = { enabled: body.enabled, policyVersion: CONSENT_VERSION,
      ...(body.enabled ? { grantedAt: new Date(), withdrawnAt: null } : { withdrawnAt: new Date() }) };
    await tx.researchConsent.upsert({ where: { userId }, update: data, create: { userId, ...data } });
    if (!body.enabled) await eraseResearchData(tx, userId);
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  await prisma.$transaction(async tx => {
    await tx.researchConsent.updateMany({ where: { userId }, data: { enabled: false, withdrawnAt: new Date() } });
    await eraseResearchData(tx, userId);
  });
  return NextResponse.json({ success: true });
}
