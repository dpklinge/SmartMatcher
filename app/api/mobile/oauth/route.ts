import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { issueMobileTokens } from "@/lib/mobile-auth";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
  try {
    const { provider, idToken, accessToken: fbAccessToken } = await req.json();

    let providerAccountId: string;
    let email: string | null = null;
    let name: string | null = null;
    let image: string | null = null;

    if (provider === "google") {
      if (!idToken) return NextResponse.json({ error: "idToken required" }, { status: 400 });
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub) return NextResponse.json({ error: "Invalid Google token" }, { status: 400 });
      providerAccountId = payload.sub;
      email = payload.email ?? null;
      name = payload.name ?? null;
      image = payload.picture ?? null;
    } else if (provider === "facebook") {
      if (!fbAccessToken) return NextResponse.json({ error: "accessToken required" }, { status: 400 });
      const res = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${fbAccessToken}`
      );
      if (!res.ok) return NextResponse.json({ error: "Invalid Facebook token" }, { status: 400 });
      const data = await res.json();
      if (!data.id) return NextResponse.json({ error: "Invalid Facebook token" }, { status: 400 });
      providerAccountId = data.id;
      email = data.email ?? null;
      name = data.name ?? null;
      image = data.picture?.data?.url ?? null;
    } else {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    // Find existing account link
    let user = await prisma.user.findFirst({
      where: { accounts: { some: { provider, providerAccountId } } },
    });

    // Fall back to email match
    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    // Create new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          image,
          emailVerified: email ? new Date() : undefined,
          onboardingStep: "PROFILE_SETUP",
          profile: { create: {} },
          accounts: {
            create: {
              type: "oauth",
              provider,
              providerAccountId,
            },
          },
        },
      });
    } else {
      // Link account if not yet linked
      await prisma.account.upsert({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        update: {},
        create: { userId: user.id, type: "oauth", provider, providerAccountId },
      });
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
    console.error("[mobile/oauth]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
