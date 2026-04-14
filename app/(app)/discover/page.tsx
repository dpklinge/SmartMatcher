import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CardDeck } from "@/components/discover/CardDeck";

export default async function DiscoverPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-black text-gray-900">💞 Discover</h1>
          <p className="text-xs text-gray-400">Ranked by your compatibility</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-700">{session.user.name}</p>
        </div>
      </div>

      {/* Deck — takes remaining height */}
      <div className="flex-1 overflow-hidden">
        <CardDeck />
      </div>
    </div>
  );
}
