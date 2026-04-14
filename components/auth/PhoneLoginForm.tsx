"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { phoneSchema, otpSchema, type PhoneInput, type OtpInput } from "@/lib/validations/auth.schema";

export function PhoneLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [serverError, setServerError] = useState("");

  const phoneForm = useForm<PhoneInput>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) });

  const sendOtp = async (data: PhoneInput) => {
    setServerError("");
    const res = await fetch("/api/2fa/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: data.phoneNumber }),
    });
    if (!res.ok) {
      const err = await res.json();
      setServerError(err.error ?? "Failed to send code");
      return;
    }
    setPhoneNumber(data.phoneNumber);
    setStep("otp");
  };

  const verifyOtp = async (data: OtpInput) => {
    setServerError("");
    const result = await signIn("phone-otp", {
      phoneNumber,
      otp: data.code,
      redirect: false,
    });
    if (result?.error) {
      setServerError("Invalid or expired code");
      return;
    }
    router.push("/discover");
    router.refresh();
  };

  if (step === "otp") {
    return (
      <form onSubmit={otpForm.handleSubmit(verifyOtp)} className="space-y-4">
        <p className="text-sm text-gray-600 text-center">
          Enter the 6-digit code sent to <strong>{phoneNumber}</strong>
        </p>
        <div>
          <input
            {...otpForm.register("code")}
            type="text"
            placeholder="000000"
            maxLength={6}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
          {otpForm.formState.errors.code && (
            <p className="mt-1 text-sm text-red-500">{otpForm.formState.errors.code.message}</p>
          )}
        </div>
        {serverError && <p className="text-sm text-red-500 text-center">{serverError}</p>}
        <button
          type="submit"
          disabled={otpForm.formState.isSubmitting}
          className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold disabled:opacity-60"
        >
          {otpForm.formState.isSubmitting ? "Verifying…" : "Verify Code"}
        </button>
        <button type="button" onClick={() => setStep("phone")} className="w-full text-sm text-gray-500 underline">
          Change number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={phoneForm.handleSubmit(sendOtp)} className="space-y-4">
      <div>
        <input
          {...phoneForm.register("phoneNumber")}
          type="tel"
          placeholder="+1 234 567 8900"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        {phoneForm.formState.errors.phoneNumber && (
          <p className="mt-1 text-sm text-red-500">{phoneForm.formState.errors.phoneNumber.message}</p>
        )}
      </div>
      {serverError && <p className="text-sm text-red-500 text-center">{serverError}</p>}
      <button
        type="submit"
        disabled={phoneForm.formState.isSubmitting}
        className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold disabled:opacity-60"
      >
        {phoneForm.formState.isSubmitting ? "Sending…" : "Send Code"}
      </button>
    </form>
  );
}
