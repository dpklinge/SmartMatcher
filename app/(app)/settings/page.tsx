import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <h1 className="text-xl font-black text-gray-900">⚙️ Settings</h1>
      </div>

      <div className="divide-y divide-gray-50">
        <Link href="/settings/security" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="font-semibold text-gray-800">Security & 2FA</p>
              <p className="text-sm text-gray-400">
                {session.user.twoFactorEnabled ? "2FA enabled" : "Enable two-factor authentication"}
              </p>
            </div>
          </div>
          <span className="text-gray-300">›</span>
        </Link>

        <Link href="/onboarding/questionnaire" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">📝</span>
            <div>
              <p className="font-semibold text-gray-800">Retake Questionnaire</p>
              <p className="text-sm text-gray-400">Update your personality answers</p>
            </div>
          </div>
          <span className="text-gray-300">›</span>
        </Link>

        <Link href="/onboarding/priorities" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <p className="font-semibold text-gray-800">Match Priorities</p>
              <p className="text-sm text-gray-400">Update what matters most to you</p>
            </div>
          </div>
          <span className="text-gray-300">›</span>
        </Link>
      </div>
    </div>
  );
}
