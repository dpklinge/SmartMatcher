"use client";

import { useState } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";

type AuthMethod = "email" | "phone";

export default function LoginPage() {
  const [method, setMethod] = useState<AuthMethod>("email");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
      </div>

      <OAuthButtons />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Method tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setMethod("email")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            method === "email" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
          }`}
        >
          Email
        </button>
        <button
          onClick={() => setMethod("phone")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            method === "phone" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
          }`}
        >
          Phone
        </button>
      </div>

      {method === "email" ? <LoginForm /> : <PhoneLoginForm />}

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-rose-500 font-semibold hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
