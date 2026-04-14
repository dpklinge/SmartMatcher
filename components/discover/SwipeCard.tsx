"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";
import Image from "next/image";
import { CompatibilityBadge } from "./CompatibilityBadge";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/questionnaire/questions";
import { cn } from "@/lib/utils";

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

interface Props {
  candidate: Candidate;
  onSwipe: (direction: "LIKE" | "PASS") => void;
  isTop: boolean;
  zIndex: number;
}

const SWIPE_THRESHOLD = 100;

export function SwipeCard({ candidate, onSwipe, isTop, zIndex }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const controls = useAnimation();
  const [photoIdx, setPhotoIdx] = useState(0);

  const photos = candidate.profile?.photos?.length
    ? candidate.profile.photos.map((p) => p.url)
    : candidate.image
    ? [candidate.image]
    : ["/placeholder-avatar.svg"];

  const handleDragEnd = async (_: unknown, info: { offset: { x: number } }) => {
    const offset = info.offset.x;
    if (Math.abs(offset) > SWIPE_THRESHOLD) {
      await controls.start({
        x: offset > 0 ? 1000 : -1000,
        opacity: 0,
        transition: { duration: 0.3 },
      });
      onSwipe(offset > 0 ? "LIKE" : "PASS");
    } else {
      controls.start({ x: 0, rotate: 0, transition: { type: "spring" } });
    }
  };

  const age = candidate.profile?.birthDate
    ? new Date().getFullYear() - new Date(candidate.profile.birthDate).getFullYear()
    : null;

  const breakdown = candidate.compatibility.breakdown;

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 rounded-3xl bg-white shadow-lg"
        style={{ zIndex, transform: `scale(${0.95 - (zIndex - 1) * 0.02}) translateY(${(zIndex - 1) * 8}px)` }}
      />
    );
  }

  return (
    <motion.div
      style={{ x, rotate, zIndex }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      animate={controls}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <div className="relative h-full rounded-3xl overflow-hidden bg-gray-900 shadow-2xl select-none">
        {/* Photos */}
        <div className="absolute inset-0">
          <img
            src={photos[photoIdx] ?? "/placeholder-avatar.svg"}
            alt={candidate.name ?? "Profile"}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>

        {/* Photo indicators */}
        {photos.length > 1 && (
          <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-10">
            {photos.map((_, i) => (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
                className={cn(
                  "flex-1 h-1 rounded-full transition-colors cursor-pointer",
                  i === photoIdx ? "bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>
        )}

        {/* Like/Pass overlays */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute top-12 left-6 z-20 border-4 border-emerald-400 rounded-2xl px-4 py-2 rotate-[-12deg]"
        >
          <span className="text-emerald-400 font-black text-2xl tracking-widest">LIKE</span>
        </motion.div>

        <motion.div
          style={{ opacity: passOpacity }}
          className="absolute top-12 right-6 z-20 border-4 border-rose-400 rounded-2xl px-4 py-2 rotate-[12deg]"
        >
          <span className="text-rose-400 font-black text-2xl tracking-widest">PASS</span>
        </motion.div>

        {/* Info panel */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-white font-bold text-2xl">
                {candidate.name}{age ? `, ${age}` : ""}
              </h2>
              {candidate.profile?.location && (
                <p className="text-white/70 text-sm flex items-center gap-1">
                  <span>📍</span> {candidate.profile.location}
                </p>
              )}
              {candidate.profile?.occupation && (
                <p className="text-white/70 text-sm">{candidate.profile.occupation}</p>
              )}
            </div>
            <CompatibilityBadge percentage={candidate.compatibility.percentage} />
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Object.entries(breakdown).map(([cat, score]) => (
              <div key={cat} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80 text-xs truncate">{CATEGORY_LABELS[cat]}</span>
                    <span className="text-white text-xs font-semibold ml-1">{Math.round(score * 100)}%</span>
                  </div>
                  <div className="h-1 bg-white/20 rounded-full mt-1">
                    <div
                      className="h-1 bg-rose-400 rounded-full"
                      style={{ width: `${Math.round(score * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {candidate.profile?.bio && (
            <p className="text-white/80 text-sm line-clamp-2">{candidate.profile.bio}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
