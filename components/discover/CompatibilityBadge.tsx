"use client";

import { cn } from "@/lib/utils";

interface Props {
  percentage: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function CompatibilityBadge({ percentage, size = "md", showLabel = true }: Props) {
  const color =
    percentage >= 80
      ? "from-emerald-400 to-teal-500"
      : percentage >= 60
      ? "from-yellow-400 to-orange-400"
      : percentage >= 40
      ? "from-orange-400 to-rose-400"
      : "from-rose-400 to-pink-500";

  const sizeClasses = {
    sm: "w-12 h-12 text-xs",
    md: "w-16 h-16 text-sm",
    lg: "w-20 h-20 text-base",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shadow-lg",
          sizeClasses[size],
          color
        )}
      >
        {percentage}%
      </div>
      {showLabel && <span className="text-xs text-gray-500 font-medium">Match</span>}
    </div>
  );
}
