"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QuestionCard } from "@/components/onboarding/QuestionCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { QUESTIONS, CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/questionnaire/questions";
import type { Question } from "@/types/questionnaire";
import { cn } from "@/lib/utils";

const CATEGORIES = ["PERSONALITY", "LIFE_GOALS", "VALUES_AND_BELIEFS", "LIFESTYLE"];

export default function QuestionnairePage() {
  const router = useRouter();
  const [currentCategoryIdx, setCurrentCategoryIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const category = CATEGORIES[currentCategoryIdx];
  const categoryQuestions = QUESTIONS.filter((q) => q.category === category);
  const question = categoryQuestions[currentQuestionIdx];
  const totalAnswered = Object.keys(answers).length;
  const progress = totalAnswered / QUESTIONS.length;

  useEffect(() => {
    fetch("/api/questionnaire")
      .then((r) => r.json())
      .then((data) => {
        const loaded: Record<string, unknown> = {};
        for (const [qId, val] of Object.entries(data.answers as Record<string, string>)) {
          try { loaded[qId] = JSON.parse(val); } catch { loaded[qId] = val; }
        }
        setAnswers(loaded);
      })
      .finally(() => setLoading(false));
  }, []);

  const saveCurrentAnswer = useCallback(async (qId: string, value: unknown) => {
    await fetch("/api/questionnaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { [qId]: value } }),
    });
  }, []);

  const handleAnswer = (value: unknown) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const goNext = async () => {
    // Save current answer
    if (answers[question.id] !== undefined) {
      await saveCurrentAnswer(question.id, answers[question.id]);
    }

    if (currentQuestionIdx < categoryQuestions.length - 1) {
      setCurrentQuestionIdx((i) => i + 1);
    } else if (currentCategoryIdx < CATEGORIES.length - 1) {
      setCurrentCategoryIdx((i) => i + 1);
      setCurrentQuestionIdx(0);
    } else {
      // All done
      setSaving(true);
      await fetch("/api/questionnaire/complete", { method: "POST" });
      router.push("/onboarding/priorities");
      router.refresh();
    }
  };

  const goBack = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((i) => i - 1);
    } else if (currentCategoryIdx > 0) {
      setCurrentCategoryIdx((i) => i - 1);
      const prevCategory = CATEGORIES[currentCategoryIdx - 1];
      const prevQuestions = QUESTIONS.filter((q) => q.category === prevCategory);
      setCurrentQuestionIdx(prevQuestions.length - 1);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  const isFirst = currentCategoryIdx === 0 && currentQuestionIdx === 0;
  const isLast = currentCategoryIdx === CATEGORIES.length - 1 && currentQuestionIdx === categoryQuestions.length - 1;
  const hasAnswer = answers[question?.id] !== undefined;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-6 pb-4 bg-white sticky top-0 z-10 border-b border-gray-50">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-500">
              {totalAnswered} / {QUESTIONS.length} answered
            </div>
            <div className="flex gap-1.5">
              {CATEGORIES.map((cat, i) => (
                <div
                  key={cat}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    i === currentCategoryIdx
                      ? "bg-rose-100 text-rose-700"
                      : i < currentCategoryIdx
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span className="hidden sm:inline">{CATEGORY_LABELS[cat]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col justify-between max-w-lg mx-auto w-full px-4 py-6">
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-lg">{CATEGORY_ICONS[category]}</span>
            <span className="text-sm font-semibold text-rose-500">{CATEGORY_LABELS[category]}</span>
          </div>
          <p className="text-xs text-gray-400">
            Question {currentQuestionIdx + 1} of {categoryQuestions.length}
          </p>
        </div>

        {question && (
          <div className="flex-1">
            <QuestionCard
              question={question}
              value={answers[question.id]}
              onChange={handleAnswer}
            />
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {!isFirst && (
            <button
              onClick={goBack}
              className="px-6 py-3 border-2 border-gray-200 rounded-2xl font-semibold text-gray-600 hover:border-gray-300 transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            onClick={goNext}
            disabled={!hasAnswer || saving}
            className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saving ? "Saving…" : isLast ? "Done! Set Priorities →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
