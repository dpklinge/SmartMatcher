"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  options: string[];
  value?: string[];
  onChange: (v: string[]) => void;
}

export function RankQuestion({ options, value, onChange }: Props) {
  const [ranked, setRanked] = useState<string[]>(value ?? [...options]);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newRanked = [...ranked];
    [newRanked[idx - 1], newRanked[idx]] = [newRanked[idx], newRanked[idx - 1]];
    setRanked(newRanked);
    onChange(newRanked);
  };

  const moveDown = (idx: number) => {
    if (idx === ranked.length - 1) return;
    const newRanked = [...ranked];
    [newRanked[idx], newRanked[idx + 1]] = [newRanked[idx + 1], newRanked[idx]];
    setRanked(newRanked);
    onChange(newRanked);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 text-center mb-3">Drag or use arrows to reorder — #1 is your top priority</p>
      {ranked.map((item, idx) => (
        <div
          key={item}
          className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl"
        >
          <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 text-sm font-bold flex items-center justify-center flex-shrink-0">
            {idx + 1}
          </span>
          <span className="flex-1 font-medium text-gray-700">{item}</span>
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => moveUp(idx)}
              disabled={idx === 0}
              className={cn("p-1 rounded transition-colors", idx === 0 ? "text-gray-200" : "text-gray-500 hover:text-rose-500")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => moveDown(idx)}
              disabled={idx === ranked.length - 1}
              className={cn("p-1 rounded transition-colors", idx === ranked.length - 1 ? "text-gray-200" : "text-gray-500 hover:text-rose-500")}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
