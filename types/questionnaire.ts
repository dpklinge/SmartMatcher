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
