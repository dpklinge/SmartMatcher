"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function TwoFactorSetup() {
  const router = useRouter();
  const [method, setMethod] = useState<"TOTP" | "SMS" | null>(null);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"choose" | "setup" | "verify">("choose");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setupTOTP = async () => {
    setLoading(true);
    const res = await fetch("/api/2fa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "TOTP" }),
    });
    const data = await res.json();
    setQrCode(data.qrCode);
    setSecret(data.secret);
    setStep("verify");
    setLoading(false);
  };

  const setupSMS = async () => {
    if (!phoneNumber) { setError("Phone number required"); return; }
    setLoading(true);
    const res = await fetch("/api/2fa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "SMS", phoneNumber }),
    });
    if (res.ok) {
      setStep("verify");
    } else {
      setError("Failed to send SMS");
    }
    setLoading(false);
  };

  const verify = async () => {
    setError("");
    setLoading(true);
    const res = await fetch("/api/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      router.push("/settings/security?setup=success");
      router.refresh();
    } else {
      setError("Invalid code. Please try again.");
    }
    setLoading(false);
  };

  if (step === "choose") {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 text-center">Enable Two-Factor Authentication</h2>
        <p className="text-sm text-gray-600 text-center">Add an extra layer of security to your account</p>
        <div className="space-y-3">
          <button
            onClick={() => { setMethod("TOTP"); setStep("setup"); setupTOTP(); }}
            className="w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-rose-400 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-semibold text-gray-800">Authenticator App</p>
                <p className="text-sm text-gray-500">Use Google Authenticator, Authy, or similar</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => { setMethod("SMS"); setStep("setup"); }}
            className="w-full p-4 border-2 border-gray-200 rounded-xl text-left hover:border-rose-400 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-semibold text-gray-800">SMS Text Message</p>
                <p className="text-sm text-gray-500">Receive a code via text message</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (step === "setup" && method === "SMS") {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 text-center">SMS Two-Factor Authentication</h2>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1 234 567 8900"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button onClick={setupSMS} disabled={loading} className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold disabled:opacity-60">
          {loading ? "Sending…" : "Send Verification Code"}
        </button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="space-y-6">
        {method === "TOTP" && qrCode && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 text-center">Scan QR Code</h2>
            <p className="text-sm text-gray-600 text-center">Scan this code with your authenticator app</p>
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code" className="w-48 h-48 border border-gray-200 rounded-xl p-2" />
            </div>
            <details className="text-center">
              <summary className="text-sm text-gray-500 cursor-pointer">Can&apos;t scan? Enter manually</summary>
              <p className="mt-2 font-mono text-xs bg-gray-100 p-2 rounded-lg break-all">{secret}</p>
            </details>
          </div>
        )}
        {method === "SMS" && (
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900 text-center">Enter Your Code</h2>
            <p className="text-sm text-gray-600 text-center">We sent a 6-digit code to {phoneNumber}</p>
          </div>
        )}
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000"
          maxLength={6}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button onClick={verify} disabled={loading || code.length !== 6} className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold disabled:opacity-60">
          {loading ? "Verifying…" : "Enable 2FA"}
        </button>
      </div>
    );
  }

  return null;
}
