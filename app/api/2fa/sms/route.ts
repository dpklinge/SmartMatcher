import { NextRequest, NextResponse } from "next/server";
import { generateSMSOtp, sendSMSOtp } from "@/lib/2fa/sms";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { phoneNumber } = await req.json();
  if (!phoneNumber) return NextResponse.json({ error: "Phone number required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { phoneNumber } });
  if (!user) return NextResponse.json({ error: "No account found with that number" }, { status: 404 });

  const { code, expiry } = generateSMSOtp();
  await prisma.user.update({
    where: { id: user.id },
    data: { smsOtpCode: code, smsOtpExpiry: expiry },
  });

  await sendSMSOtp(phoneNumber, code);
  return NextResponse.json({ message: "OTP sent" });
}
