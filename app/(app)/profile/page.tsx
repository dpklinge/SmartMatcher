import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { signOut } from "@/auth";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: { include: { photos: { orderBy: { order: "asc" } } } } },
  });

  const profile = user?.profile;
  const age = profile?.birthDate
    ? new Date().getFullYear() - new Date(profile.birthDate).getFullYear()
    : null;

  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900">👤 My Profile</h1>
        <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700">Settings</Link>
      </div>

      <div className="px-5 py-6 space-y-6">
        {/* Photo */}
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
            {(profile?.photos?.[0]?.url ?? user?.image) ? (
              <img src={profile?.photos?.[0]?.url ?? user?.image ?? ""} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {user?.name}{age ? `, ${age}` : ""}
            </h2>
            {profile?.location && <p className="text-gray-500 text-sm">📍 {profile.location}</p>}
            {profile?.occupation && <p className="text-gray-500 text-sm">{profile.occupation}</p>}
          </div>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div>
            <h3 className="font-bold text-gray-700 mb-1">About</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Education", value: profile?.education },
            { label: "Seeking", value: profile?.seeking },
          ].filter((i) => i.value).map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 font-medium">{item.label}</p>
              <p className="font-semibold text-gray-800 text-sm capitalize">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Link
            href="/onboarding/questionnaire"
            className="block w-full py-3 border-2 border-gray-200 rounded-xl text-center font-semibold text-gray-700 hover:border-rose-300 transition-colors text-sm"
          >
            ✏️ Retake Questionnaire
          </Link>
          <Link
            href="/onboarding/priorities"
            className="block w-full py-3 border-2 border-gray-200 rounded-xl text-center font-semibold text-gray-700 hover:border-rose-300 transition-colors text-sm"
          >
            🎯 Update Match Priorities
          </Link>
          <Link
            href="/settings/security"
            className="block w-full py-3 border-2 border-gray-200 rounded-xl text-center font-semibold text-gray-700 hover:border-rose-300 transition-colors text-sm"
          >
            🔒 Security & 2FA
          </Link>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}>
            <button
              type="submit"
              className="w-full py-3 border-2 border-red-100 rounded-xl text-center font-semibold text-red-500 hover:bg-red-50 transition-colors text-sm"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
