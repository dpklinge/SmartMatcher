import type { Question } from "@/types/questionnaire";
import catalog from "./catalog.json";

export const QUESTIONNAIRE_VERSION = 2;
export const QUESTIONS = catalog as Question[];
export const PREFERENCE_QUESTIONS = QUESTIONS.filter(q => q.matchingMode === "PREFERENCE");

export const CATEGORY_LABELS: Record<string, string> = {
  PERSONALITY: "Personality",
  LIFE_GOALS: "Life Goals",
  VALUES_AND_BELIEFS: "Values & Beliefs",
  LIFESTYLE: "Lifestyle",
};

export const CATEGORY_ICONS: Record<string, string> = {
  PERSONALITY: "🧠",
  LIFE_GOALS: "🎯",
  VALUES_AND_BELIEFS: "⚖️",
  LIFESTYLE: "🌿",
};

export function getQuestionsByCategory(category: string): Question[] {
  return QUESTIONS.filter((q) => q.category === category).sort((a, b) => a.order - b.order);
}
