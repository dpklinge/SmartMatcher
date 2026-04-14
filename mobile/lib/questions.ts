export type QuestionCategory = "PERSONALITY" | "LIFE_GOALS" | "VALUES_AND_BELIEFS" | "LIFESTYLE";
export type QuestionType = "SCALE" | "SINGLE_CHOICE" | "MULTI_CHOICE" | "RANK";
export type Importance = "NOT_IMPORTANT" | "SOMEWHAT_IMPORTANT" | "IMPORTANT";

export interface Question {
  id: string;
  key: string;
  category: QuestionCategory;
  text: string;
  type: QuestionType;
  options?: string[];
  minLabel?: string;
  maxLabel?: string;
  order: number;
}

export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  PERSONALITY: "Personality",
  LIFE_GOALS: "Life Goals",
  VALUES_AND_BELIEFS: "Values & Beliefs",
  LIFESTYLE: "Lifestyle",
};

export const CATEGORY_ICONS: Record<QuestionCategory, string> = {
  PERSONALITY: "🧠",
  LIFE_GOALS: "🎯",
  VALUES_AND_BELIEFS: "⚖️",
  LIFESTYLE: "🌿",
};

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  NOT_IMPORTANT: "Not Important",
  SOMEWHAT_IMPORTANT: "Somewhat Important",
  IMPORTANT: "Important",
};

export const CATEGORIES: QuestionCategory[] = [
  "PERSONALITY",
  "LIFE_GOALS",
  "VALUES_AND_BELIEFS",
  "LIFESTYLE",
];
