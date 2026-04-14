import { NextRequest, NextResponse } from "next/server";
import { verifyPendingToken, issueMobileTokens } from "@/lib/mobile-auth";
import { verifyTOTPToken } from "@/lib/2fa/totp";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Pending token required" }, { status: 401 });
    }

    const pendingToken = authHeader.slice(7);
    const userId = verifyPendingToken(pendingToken);
    if (!userId) return NextResponse.json({ error: "Invalid or expired pending token" }, { status: 401 });

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let valid = false;
    if (user.twoFactorMethod === "TOTP" && user.totpSecret) {
      valid = verifyTOTPToken(user.totpSecret, code);
    } else if (user.twoFactorMethod === "SMS") {
      const now = new Date();
      valid = user.smsOtpCode === code && !!user.smsOtpExpiry && user.smsOtpExpiry > now;
      if (valid) {
        await prisma.user.update({
          where: { id: userId },
          data: { smsOtpCode: null, smsOtpExpiry: null },
        });
      }
    }

    if (!valid) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      onboardingStep: user.onboardingStep,
      twoFactorEnabled: user.twoFactorEnabled,
    };
    const { accessToken, refreshToken } = await issueMobileTokens(userId, userPayload);

    return NextResponse.json({ accessToken, refreshToken, user: userPayload });
  } catch (err) {
    console.error("[mobile/2fa/verify]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
