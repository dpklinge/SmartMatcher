import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { issueMobileTokens } from "@/lib/mobile-auth";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) return NextResponse.json({ error: "Refresh token required" }, { status: 400 });

    // Verify the refresh token signature + expiry
    let payload: { sub: string };
    try {
      payload = jwt.verify(refreshToken, process.env.MOBILE_JWT_REFRESH_SECRET!) as { sub: string };
    } catch {
      return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
    }

    // Check it exists in DB (rotation: delete old, issue new)
    const stored = await prisma.mobileRefreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      return NextResponse.json({ error: "Refresh token revoked or expired" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, image: true, onboardingStep: true, twoFactorEnabled: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

    // Delete old refresh token (rotation)
    await prisma.mobileRefreshToken.delete({ where: { token: refreshToken } });

    const userPayload = { ...user };
    const { accessToken, refreshToken: newRefreshToken } = await issueMobileTokens(user.id, userPayload);

    return NextResponse.json({ accessToken, refreshToken: newRefreshToken, user: userPayload });
  } catch (err) {
    console.error("[mobile/refresh]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
