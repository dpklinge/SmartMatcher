import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { getPairCompatibility } from "@/lib/matching/service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await params;
  const result = await getPairCompatibility(session.user.id, userId);
  if (!result) return NextResponse.json({ error: "User not found" }, { status: 404 });
  // Do not disclose which private partner requirement or answer caused exclusion.
  const { conflictQuestionIds, unresolvedQuestionIds, ...publicResult } = result;
  void conflictQuestionIds; void unresolvedQuestionIds;
  return NextResponse.json(publicResult);
}
