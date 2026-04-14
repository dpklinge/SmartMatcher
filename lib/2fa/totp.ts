import speakeasy from "speakeasy";
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const KEY_HEX = process.env.TOTP_ENCRYPTION_KEY ?? "0".repeat(64);
const KEY = Buffer.from(KEY_HEX.padEnd(64, "0").slice(0, 64), "hex");

export function generateTOTPSecret(userEmail: string): {
  secret: string;
  otpauth_url: string;
  encrypted: string;
} {
  const generated = speakeasy.generateSecret({
    name: `Matchmaker (${userEmail})`,
    issuer: "Matchmaker",
    length: 20,
  });

  const encrypted = encryptSecret(generated.base32);
  return {
    secret: generated.base32,
    otpauth_url: generated.otpauth_url ?? "",
    encrypted,
  };
}

export function verifyTOTPToken(encryptedSecret: string, token: string): boolean {
  try {
    const secret = decryptSecret(encryptedSecret);
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });
  } catch {
    return false;
  }
}

function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decryptSecret(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
