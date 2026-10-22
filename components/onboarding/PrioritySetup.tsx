"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/types/questionnaire";
import { QUESTIONNAIRE_VERSION } from "@/lib/questionnaire/questions";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/questionnaire/questions";
import { cn } from "@/lib/utils";

type Importance = "NOT_IMPORTANT" | "SOMEWHAT_IMPORTANT" | "IMPORTANT";

interface Props {
  questions: Question[];
  initialPriorities: Record<string, Importance>;
}

const IMPORTANCE_OPTIONS: Importance[] = ["NOT_IMPORTANT", "SOMEWHAT_IMPORTANT", "IMPORTANT"];

export function PrioritySetup({ questions: allQuestions, initialPriorities }: Props) {
  const questions = allQuestions.filter(q => q.matchingMode === "PREFERENCE");
  const router = useRouter();
  const [priorities, setPriorities] = useState<Record<string, Importance>>(
    initialPriorities ?? Object.fromEntries(questions.map((q) => [q.id, "SOMEWHAT_IMPORTANT"]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = [...new Set(questions.map((q) => q.category))];

  const setPriority = (questionId: string, importance: Importance) => {
    setPriorities((prev) => ({ ...prev, [questionId]: importance }));
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/priorities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: QUESTIONNAIRE_VERSION, priorities: Object.fromEntries(
          questions.map(q => [q.id, priorities[q.id] ?? "SOMEWHAT_IMPORTANT"])) }),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not save priorities.");
      router.push("/discover"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save priorities."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <div key={category} className="space-y-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <span>{CATEGORY_ICONS[category]}</span>
            {CATEGORY_LABELS[category]}
          </h3>
          {questions
            .filter((q) => q.category === category)
            .map((question) => {
              const current = priorities[question.id] ?? "SOMEWHAT_IMPORTANT";
              return (
                <div key={question.id} className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-gray-700 leading-snug">{question.text}</p>
                  <div className="flex gap-2">
                    {IMPORTANCE_OPTIONS.map((imp) => (
                      <button
                        key={imp}
                        type="button"
                        onClick={() => setPriority(question.id, imp)}
                        className={cn(
                          "flex-1 py-2 px-1 rounded-lg border-2 text-xs font-semibold transition-all",
                          current === imp
                            ? imp === "IMPORTANT"
                              ? "border-rose-500 bg-rose-500 text-white"
                              : imp === "SOMEWHAT_IMPORTANT"
                              ? "border-yellow-400 bg-yellow-400 text-white"
                              : "border-gray-300 bg-gray-300 text-white"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        )}
                      >
                        {imp === "NOT_IMPORTANT" ? "Not" : imp === "SOMEWHAT_IMPORTANT" ? "Somewhat" : "Important"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      ))}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="pt-4">
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">How priorities work</h4>
          <p className="text-xs text-gray-500 mb-2">Firm requirements always apply in both directions. Scores measure stated preferences, not the chance of relationship success.</p>
          <div className="space-y-1 text-xs text-gray-500">
            <p>🔴 <strong>Important</strong> — more influence on preference alignment</p>
            <p>🟡 <strong>Somewhat Important</strong> — moderately weighted</p>
            <p>⚪ <strong>Not Important</strong> — excluded from preference ranking; firm requirements still apply</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg disabled:opacity-60"
        >
          {saving ? "Saving…" : "Start Discovering! 🎉"}
        </button>
      </div>
    </div>
  );
}
