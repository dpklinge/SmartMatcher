"use client";

import { useState, useEffect, useCallback } from "react";
import { SwipeCard } from "./SwipeCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface Candidate {
  id: string;
  name: string | null;
  image: string | null;
  profile: {
    bio?: string | null;
    birthDate?: string | null;
    location?: string | null;
    occupation?: string | null;
    photos?: { url: string }[];
  } | null;
  compatibility: {
    percentage: number;
    breakdown: Record<string, number>;
  };
}

export function CardDeck() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipeResult, setSwipeResult] = useState<{ matched: boolean; name: string } | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/discover");
    if (res.ok) {
      const data = await res.json();
      setCandidates(data.candidates);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const handleSwipe = async (candidateId: string, direction: "LIKE" | "PASS") => {
    const candidate = candidates.find((c) => c.id === candidateId);

    // Optimistically remove from deck
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));

    const res = await fetch("/api/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: candidateId, direction }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.matched && candidate) {
        setSwipeResult({ matched: true, name: candidate.name ?? "Someone" });
        setTimeout(() => setSwipeResult(null), 3000);
      }
    }

    // Fetch more when deck is getting low
    if (candidates.length <= 3) {
      fetchCandidates();
    }
  };

  if (loading && candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <LoadingSpinner />
        <p className="text-gray-500 text-sm">Finding your matches…</p>
      </div>
    );
  }

  if (!loading && candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800">You've seen everyone!</h2>
        <p className="text-gray-500">Check back later for new matches, or update your preferences.</p>
        <button
          onClick={fetchCandidates}
          className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-semibold"
        >
          Refresh
        </button>
      </div>
    );
  }

  const top3 = candidates.slice(0, 3);

  return (
    <div className="relative flex flex-col h-full">
      {/* Match notification */}
      {swipeResult?.matched && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-semibold animate-bounce">
          🎉 It&apos;s a match with {swipeResult.name}!
        </div>
      )}

      {/* Card stack */}
      <div className="relative flex-1 mx-4 mt-4">
        {[...top3].reverse().map((candidate, reversedIdx) => {
          const idx = top3.length - 1 - reversedIdx;
          return (
            <SwipeCard
              key={candidate.id}
              candidate={candidate}
              onSwipe={(dir) => handleSwipe(candidate.id, dir)}
              isTop={idx === 0}
              zIndex={idx + 1}
            />
          );
        })}
      </div>

      {/* Action buttons */}
      {candidates.length > 0 && (
        <div className="flex items-center justify-center gap-6 py-6">
          <button
            onClick={() => handleSwipe(candidates[0].id, "PASS")}
            className="w-16 h-16 rounded-full bg-white shadow-lg border-2 border-gray-100 flex items-center justify-center text-2xl hover:scale-110 transition-transform"
            aria-label="Pass"
          >
            ✕
          </button>
          <button
            onClick={() => handleSwipe(candidates[0].id, "LIKE")}
            className="w-20 h-20 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 shadow-xl flex items-center justify-center text-3xl hover:scale-110 transition-transform"
            aria-label="Like"
          >
            ❤️
          </button>
        </div>
      )}
    </div>
  );
}
