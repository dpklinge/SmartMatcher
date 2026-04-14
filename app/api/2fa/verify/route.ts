import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { verifyTOTPToken } from "@/lib/2fa/totp";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let valid = false;

  if (user.twoFactorMethod === "TOTP" && user.totpSecret) {
    valid = verifyTOTPToken(user.totpSecret, code);
  } else if (user.twoFactorMethod === "SMS") {
    const now = new Date();
    valid = user.smsOtpCode === code && !!user.smsOtpExpiry && user.smsOtpExpiry > now;
    if (valid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { smsOtpCode: null, smsOtpExpiry: null },
      });
    }
  }

  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  // Enable 2FA on first verify (setup flow)
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  });

  return NextResponse.json({ success: true });
}
