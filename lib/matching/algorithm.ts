import type { CompatibilityResult } from "@/types/matching";
import type { QuestionCategory } from "@/types/questionnaire";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import { WEIGHT_MAP } from "./weights";
import { scoreSimilarity } from "./scoring";

interface AnswerMap {
  [questionId: string]: string;
}

interface PriorityMap {
  [questionId: string]: string;
}

const CATEGORIES: QuestionCategory[] = [
  "PERSONALITY",
  "LIFE_GOALS",
  "VALUES_AND_BELIEFS",
  "LIFESTYLE",
];

/**
 * Computes compatibility score from the requester's perspective.
 * Score is weighted by the requester's stated importance for each question.
 */
export function computeCompatibility(
  requesterAnswers: AnswerMap,
  requesterPriorities: PriorityMap,
  targetAnswers: AnswerMap
): CompatibilityResult {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  const categoryData: Record<string, { weightedSum: number; weight: number }> = {};
  for (const cat of CATEGORIES) {
    categoryData[cat] = { weightedSum: 0, weight: 0 };
  }

  const alignedPriorities = [];

  for (const question of QUESTIONS) {
    const reqAnswer = requesterAnswers[question.id];
    const tgtAnswer = targetAnswers[question.id];
    if (!reqAnswer || !tgtAnswer) continue;

    const importance = requesterPriorities[question.id] ?? "SOMEWHAT_IMPORTANT";
    const weight = WEIGHT_MAP[importance] ?? 0;
    if (weight === 0) continue;

    const similarity = scoreSimilarity(question.type, reqAnswer, tgtAnswer);
    const contribution = similarity * weight;

    totalWeightedScore += contribution;
    totalWeight += weight;

    const cat = categoryData[question.category];
    cat.weightedSum += contribution;
    cat.weight += weight;

    if (similarity >= 0.8 && importance === "IMPORTANT") {
      alignedPriorities.push({
        questionId: question.id,
        questionText: question.text,
        category: question.category,
        similarity,
        importance,
      });
    }
  }

  const score = totalWeight === 0 ? 0 : totalWeightedScore / totalWeight;

  const categoryBreakdown = Object.fromEntries(
    CATEGORIES.map((cat) => {
      const { weightedSum, weight } = categoryData[cat];
      return [cat, weight === 0 ? 0 : weightedSum / weight];
    })
  ) as Record<QuestionCategory, number>;

  return {
    score,
    percentage: Math.round(score * 100),
    categoryBreakdown,
    alignedPriorities,
  };
}
