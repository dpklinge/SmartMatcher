import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueMobileTokens } from "@/lib/mobile-auth";
import { registerSchema } from "@/lib/validations/auth.schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        onboardingStep: "PROFILE_SETUP",
        profile: { create: {} },
      },
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

    return NextResponse.json({ accessToken, refreshToken, user: userPayload }, { status: 201 });
  } catch (err) {
    console.error("[mobile/register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
