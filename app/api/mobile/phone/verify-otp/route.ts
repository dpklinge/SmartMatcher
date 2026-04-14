import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueMobileTokens } from "@/lib/mobile-auth";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, otp } = await req.json();
    if (!phoneNumber || !otp) return NextResponse.json({ error: "Phone number and OTP required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user || !user.smsOtpCode || !user.smsOtpExpiry) {
      return NextResponse.json({ error: "No pending OTP for this number" }, { status: 400 });
    }

    const now = new Date();
    if (user.smsOtpCode !== otp || user.smsOtpExpiry < now) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { smsOtpCode: null, smsOtpExpiry: null, phoneVerified: now },
    });

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      onboardingStep: user.onboardingStep,
      twoFactorEnabled: user.twoFactorEnabled,
    };
    const { accessToken, refreshToken } = await issueMobileTokens(user.id, userPayload);

    return NextResponse.json({ accessToken, refreshToken, user: userPayload });
  } catch (err) {
    console.error("[mobile/phone/verify-otp]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
