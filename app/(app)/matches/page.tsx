import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const matches = await prisma.match.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { include: { profile: { include: { photos: { orderBy: { order: "asc" }, take: 1 } } } } },
      user2: { include: { profile: { include: { photos: { orderBy: { order: "asc" }, take: 1 } } } } },
    },
    orderBy: { matchedAt: "desc" },
  });

  const formatted = matches.map((m) => {
    const other = m.user1Id === userId ? m.user2 : m.user1;
    const photo = other.profile?.photos?.[0]?.url ?? other.image;
    return {
      matchId: m.id,
      matchedAt: m.matchedAt,
      score: Math.round(m.score * 100),
      user: { id: other.id, name: other.name, photo },
    };
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="px-5 py-4 border-b border-gray-100">
        <h1 className="text-xl font-black text-gray-900">❤️ Your Matches</h1>
        <p className="text-xs text-gray-400">{formatted.length} mutual match{formatted.length !== 1 ? "es" : ""}</p>
      </div>

      {formatted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="text-5xl mb-4">🌱</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No matches yet</h2>
          <p className="text-gray-500 text-sm">Keep swiping in Discover to find mutual connections</p>
          <Link href="/discover" className="mt-6 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-semibold text-sm">
            Go to Discover
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {formatted.map((m) => (
            <Link key={m.matchId} href={`/profile/${m.user.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100">
                  {m.user.photo ? (
                    <img src={m.user.photo} alt={m.user.name ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{m.user.name}</p>
                <p className="text-sm text-gray-400">
                  Matched {new Date(m.matchedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-3 py-1 rounded-full">
                  <span className="text-sm font-bold">{m.score}%</span>
                  <span className="text-xs">match</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
