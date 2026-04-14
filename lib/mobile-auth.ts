import { auth } from "@/auth";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export interface MobileSession {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    onboardingStep: string;
    twoFactorEnabled: boolean;
  };
}

/**
 * Returns a session from either a NextAuth cookie (web) or a Bearer JWT (mobile).
 * Pending 2FA tokens (scope: "2fa_pending") are rejected for normal API access.
 */
export async function getSession(req?: NextRequest): Promise<MobileSession | null> {
  // 1. Try NextAuth cookie session (web clients)
  const cookieSession = await auth();
  if (cookieSession?.user?.id) {
    return cookieSession as unknown as MobileSession;
  }

  // 2. Try Bearer JWT (mobile clients)
  const authHeader = req?.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.MOBILE_JWT_SECRET!) as {
      sub: string;
      scope?: string;
    };

    // Reject pending 2FA tokens from normal API use
    if (payload.scope === "2fa_pending") return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        onboardingStep: true,
        twoFactorEnabled: true,
      },
    });
    if (!user) return null;

    return { user };
  } catch {
    return null;
  }
}

/** Issue a short-lived access token (15 min) and long-lived refresh token (30 days) */
export async function issueMobileTokens(userId: string, user: MobileSession["user"]) {
  const accessToken = jwt.sign(
    { sub: userId, user },
    process.env.MOBILE_JWT_SECRET!,
    { expiresIn: "15m" }
  );

  const refreshTokenValue = jwt.sign(
    { sub: userId },
    process.env.MOBILE_JWT_REFRESH_SECRET!,
    { expiresIn: "30d" }
  );

  // Persist refresh token for rotation/invalidation
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.mobileRefreshToken.create({
    data: { token: refreshTokenValue, userId, expiresAt },
  });

  // Prune expired tokens for this user (housekeeping)
  await prisma.mobileRefreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });

  return { accessToken, refreshToken: refreshTokenValue };
}

/** Issue a short-lived pending token for 2FA challenge (2 min) */
export function issuePendingToken(userId: string): string {
  return jwt.sign(
    { sub: userId, scope: "2fa_pending" },
    process.env.MOBILE_JWT_SECRET!,
    { expiresIn: "2m" }
  );
}

/** Verify a pending 2FA token and return the userId */
export function verifyPendingToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, process.env.MOBILE_JWT_SECRET!) as {
      sub: string;
      scope?: string;
    };
    if (payload.scope !== "2fa_pending") return null;
    return payload.sub;
  } catch {
    return null;
  }
}
