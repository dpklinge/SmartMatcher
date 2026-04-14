import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueMobileTokens, issuePendingToken } from "@/lib/mobile-auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // If 2FA is enabled, return a short-lived pending token
    if (user.twoFactorEnabled) {
      const pendingToken = issuePendingToken(user.id);
      return NextResponse.json({ requires2FA: true, pendingToken, twoFactorMethod: user.twoFactorMethod });
    }

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
    console.error("[mobile/login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
