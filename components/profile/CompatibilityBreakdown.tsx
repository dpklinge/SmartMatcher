"use client";

import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/questionnaire/questions";
import { cn } from "@/lib/utils";

interface AlignedPriority {
  questionText: string;
  category: string;
  similarity: number;
  importance: string;
}

interface Props {
  percentage: number;
  breakdown: Record<string, number>;
  alignedPriorities?: AlignedPriority[];
}

export function CompatibilityBreakdown({ percentage, breakdown, alignedPriorities = [] }: Props) {
  const color =
    percentage >= 80
      ? "from-emerald-500 to-teal-500"
      : percentage >= 60
      ? "from-yellow-500 to-orange-500"
      : "from-rose-500 to-pink-500";

  return (
    <div className="space-y-5">
      {/* Overall score */}
      <div className="flex flex-col items-center py-6 bg-gray-50 rounded-2xl">
        <div className={cn("w-24 h-24 rounded-full bg-gradient-to-br flex items-center justify-center text-white mb-2", color)}>
          <span className="text-3xl font-black">{percentage}%</span>
        </div>
        <p className="font-bold text-gray-800 text-lg">Compatibility</p>
        <p className="text-gray-500 text-sm">Based on your priorities</p>
      </div>

      {/* Category breakdown */}
      <div className="space-y-3">
        <h4 className="font-bold text-gray-700">By Category</h4>
        {Object.entries(breakdown).map(([cat, score]) => {
          const pct = Math.round(score * 100);
          return (
            <div key={cat} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                  <span>{CATEGORY_ICONS[cat]}</span>
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="font-bold text-gray-800">{pct}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Aligned priorities */}
      {alignedPriorities.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold text-gray-700">🎯 Strong Matches on Your Priorities</h4>
          <div className="space-y-2">
            {alignedPriorities.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 leading-snug">{p.questionText}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">
                    {CATEGORY_ICONS[p.category]} {CATEGORY_LABELS[p.category]} · {Math.round(p.similarity * 100)}% similar
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
