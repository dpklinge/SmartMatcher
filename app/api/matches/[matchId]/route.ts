import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await params;
  const userId = session.user.id;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (match.user1Id !== userId && match.user2Id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const otherId = match.user1Id === userId ? match.user2Id : match.user1Id;

  // Delete the match and the requester's own swipe in one transaction.
  // Removing the swipe puts the other person back in the requester's discover pool.
  // The other person's swipe is left intact so the unmatched user does not
  // unexpectedly reappear in their own discover queue.
  await prisma.$transaction([
    prisma.match.delete({ where: { id: matchId } }),
    prisma.swipe.deleteMany({ where: { actorId: userId, targetId: otherId } }),
  ]);

  return NextResponse.json({ ok: true });
}
