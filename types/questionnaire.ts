export type QuestionCategory = "PERSONALITY" | "LIFE_GOALS" | "VALUES_AND_BELIEFS" | "LIFESTYLE";
export type QuestionType = "SCALE" | "SINGLE_CHOICE" | "MULTI_CHOICE" | "RANK" | "PREFERENCE";
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
  required?: boolean;
  matchingMode?: "PREFERENCE" | "CONTEXT" | "BEHAVIOR";
  description?: string;
}

export interface PreferenceAnswer {
  self: string;
  acceptable: string[];
  required: boolean;
}

export type AnswerValue = number | string | string[] | PreferenceAnswer | null;
export type AnswerMap = Record<string, unknown>;

export interface QuestionnaireAnswer {
  questionId: string;
  value: number | string | string[];
}

export interface CategoryProgress {
  category: QuestionCategory;
  label: string;
  total: number;
  answered: number;
}
