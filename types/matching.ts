import type { QuestionCategory } from "./questionnaire";

export interface CompatibilityResult {
  score: number;
  percentage: number;
  categoryBreakdown: Record<QuestionCategory, number>;
  alignedPriorities: AlignedPriority[];
  coverage: number;
  categoryCoverage: Record<QuestionCategory, number>;
  directionalScores: { requester: number; target: number };
  eligibility: "ELIGIBLE" | "INCOMPATIBLE" | "UNRESOLVED";
  conflictQuestionIds: string[];
  unresolvedQuestionIds: string[];
  questionnaireVersion: number;
  scoringVersion: string;
}

export interface AlignedPriority {
  questionId: string;
  questionText: string;
  category: QuestionCategory;
  similarity: number;
  importance: string;
}
