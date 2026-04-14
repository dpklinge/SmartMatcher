import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";
import { prisma } from "@/lib/prisma";

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <h1 className="text-xl font-black text-gray-900">🔒 Security</h1>
      </div>

      <div className="px-5 py-6 max-w-lg mx-auto">
        {user?.twoFactorEnabled ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-emerald-800">2FA is enabled</p>
                <p className="text-sm text-emerald-600">
                  Method: {user.twoFactorMethod === "TOTP" ? "Authenticator App" : "SMS"}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 text-center">
              To change your 2FA method, disable it first and set up a new one.
            </p>
          </div>
        ) : (
          <TwoFactorSetup />
        )}
      </div>
    </div>
  );
}
