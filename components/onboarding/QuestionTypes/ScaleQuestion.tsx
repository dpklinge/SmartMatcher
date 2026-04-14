"use client";

import { cn } from "@/lib/utils";

interface Props {
  questionId: string;
  minLabel?: string;
  maxLabel?: string;
  value?: number;
  onChange: (v: number) => void;
}

export function ScaleQuestion({ questionId, minLabel, maxLabel, value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      <div className="flex gap-3 justify-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "w-12 h-12 rounded-full border-2 font-semibold text-lg transition-all",
              value === n
                ? "border-rose-500 bg-rose-500 text-white scale-110"
                : "border-gray-200 text-gray-500 hover:border-rose-300"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
