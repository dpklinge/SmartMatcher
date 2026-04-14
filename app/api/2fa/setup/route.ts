import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/mobile-auth";
import { generateTOTPSecret } from "@/lib/2fa/totp";
import { generateSMSOtp, sendSMSOtp } from "@/lib/2fa/sms";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { method, phoneNumber } = body;

  if (method === "TOTP") {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.email) return NextResponse.json({ error: "Email required for TOTP" }, { status: 400 });

    const { secret, otpauth_url, encrypted } = generateTOTPSecret(user.email);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { totpSecret: encrypted, twoFactorMethod: "TOTP" },
    });

    const qrCodeDataURL = await QRCode.toDataURL(otpauth_url);
    return NextResponse.json({ qrCode: qrCodeDataURL, secret });
  }

  if (method === "SMS") {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const phone = phoneNumber || user?.phoneNumber;
    if (!phone) return NextResponse.json({ error: "Phone number required" }, { status: 400 });

    const { code, expiry } = generateSMSOtp();
    await prisma.user.update({
      where: { id: session.user.id },
      data: { phoneNumber: phone, smsOtpCode: code, smsOtpExpiry: expiry, twoFactorMethod: "SMS" },
    });
    await sendSMSOtp(phone, code);
    return NextResponse.json({ message: "OTP sent" });
  }

  return NextResponse.json({ error: "Invalid method" }, { status: 400 });
}
