"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginInput } from "@/lib/validations/auth.schema";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [pendingUserId, setPendingUserId] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setServerError("");
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error === "2FA_REQUIRED") {
        setNeeds2FA(true);
        setPendingUserId(result.error);
      } else {
        setServerError("Invalid email or password");
      }
      return;
    }

    router.push("/discover");
    router.refresh();
  };

  const verify2FA = async () => {
    const res = await fetch("/api/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: twoFACode }),
    });
    if (res.ok) {
      router.push("/discover");
      router.refresh();
    } else {
      setServerError("Invalid verification code");
    }
  };

  if (needs2FA) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 text-center">Enter your 2FA verification code</p>
        <input
          type="text"
          value={twoFACode}
          onChange={(e) => setTwoFACode(e.target.value)}
          placeholder="6-digit code"
          maxLength={6}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        {serverError && <p className="text-sm text-red-500 text-center">{serverError}</p>}
        <button
          onClick={verify2FA}
          className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold"
        >
          Verify
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <input
          {...register("email")}
          type="email"
          placeholder="Email address"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <input
          {...register("password")}
          type="password"
          placeholder="Password"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-500 text-center">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity"
      >
        {isSubmitting ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
