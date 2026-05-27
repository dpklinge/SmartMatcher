import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ swipeId: string }> }
) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { swipeId } = await params;
  const userId = session.user.id;

  const swipe = await prisma.swipe.findUnique({ where: { id: swipeId } });
  if (!swipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (swipe.actorId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.swipe.delete({ where: { id: swipeId } });
  return NextResponse.json({ ok: true });
}
