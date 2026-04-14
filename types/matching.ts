import type { QuestionCategory } from "./questionnaire";

export interface CompatibilityResult {
  score: number;
  percentage: number;
  categoryBreakdown: Record<QuestionCategory, number>;
  alignedPriorities: AlignedPriority[];
}

export interface AlignedPriority {
  questionId: string;
  questionText: string;
  category: QuestionCategory;
  similarity: number;
  importance: string;
}
