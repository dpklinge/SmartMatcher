import { NextRequest, NextResponse } from "next/server";
import { generateSMSOtp, sendSMSOtp } from "@/lib/2fa/sms";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json();
    if (!phoneNumber) return NextResponse.json({ error: "Phone number required" }, { status: 400 });

    let user = await prisma.user.findUnique({ where: { phoneNumber } });

    // Auto-create user if they don't exist (phone-first onboarding)
    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber,
          onboardingStep: "PROFILE_SETUP",
          profile: { create: {} },
        },
      });
    }

    const { code, expiry } = generateSMSOtp();
    await prisma.user.update({
      where: { id: user.id },
      data: { smsOtpCode: code, smsOtpExpiry: expiry },
    });

    await sendSMSOtp(phoneNumber, code);
    return NextResponse.json({ message: "OTP sent" });
  } catch (err) {
    console.error("[mobile/phone/send-otp]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
