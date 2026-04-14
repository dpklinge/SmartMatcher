import crypto from "crypto";

export function generateSMSOtp(): { code: string; expiry: Date } {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { code, expiry };
}

export async function sendSMSOtp(phoneNumber: string, code: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("[SMS] Twilio not configured. OTP code:", code);
    return;
  }

  const twilio = (await import("twilio")).default;
  const client = twilio(accountSid, authToken);
  await client.messages.create({
    body: `Your Matchmaker verification code is: ${code}. Expires in 10 minutes.`,
    from: fromNumber,
    to: phoneNumber,
  });
}
