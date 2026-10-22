import type { CompatibilityResult } from "@/types/matching";
import type { AnswerMap, QuestionCategory } from "@/types/questionnaire";
import { PREFERENCE_QUESTIONS, QUESTIONNAIRE_VERSION } from "@/lib/questionnaire/questions";
import { decodeAnswer, isValidAnswer, isPreferenceAnswer, UNKNOWN_ANSWERS } from "@/lib/questionnaire/answers";
import { WEIGHT_MAP } from "./weights";

const CATEGORIES: QuestionCategory[] = ["PERSONALITY", "LIFE_GOALS", "VALUES_AND_BELIEFS", "LIFESTYLE"];
export const SCORING_VERSION = "mutual-preferences-v2";
type PriorityMap = Record<string, string>;

/** Alignment with explicitly accepted answers, never a probability of relationship success. */
export function computeCompatibility(
  requesterAnswers: AnswerMap,
  requesterPriorities: PriorityMap,
  targetAnswers: AnswerMap,
  targetPriorities: PriorityMap = {},
): CompatibilityResult {
  const conflicts = new Set<string>();
  const unresolved = new Set<string>();

  function directional(own: AnswerMap, priorities: PriorityMap, other: AnswerMap) {
    let weightedScore = 0, observedWeight = 0, possibleWeight = 0;
    const categories = Object.fromEntries(CATEGORIES.map(c => [c, { sum: 0, weight: 0, possible: 0 }]));
    const aligned: CompatibilityResult["alignedPriorities"] = [];
    for (const q of PREFERENCE_QUESTIONS) {
      const a = decodeAnswer(own[q.id]);
      const b = decodeAnswer(other[q.id]);
      const validA = isValidAnswer(q, a) && isPreferenceAnswer(a);
      const validB = isValidAnswer(q, b) && isPreferenceAnswer(b);
      const known = validA && validB && !UNKNOWN_ANSWERS.has(b.self);
      // Requirements apply even if the corresponding soft priority is zero.
      if (validA && a.required) {
        if (!known) unresolved.add(q.id);
        else if (!a.acceptable.includes(b.self)) conflicts.add(q.id);
      }
      const weight = validA && a.required ? 1 : (WEIGHT_MAP[priorities[q.id] ?? "SOMEWHAT_IMPORTANT"] ?? 0);
      possibleWeight += weight;
      categories[q.category].possible += weight;
      if (!known || weight === 0) continue;
      const fit = a.acceptable.includes(b.self) ? 1 : 0;
      weightedScore += fit * weight;
      observedWeight += weight;
      categories[q.category].sum += fit * weight;
      categories[q.category].weight += weight;
      if (fit && (a.required || priorities[q.id] === "IMPORTANT")) {
        aligned.push({ questionId: q.id, questionText: q.text, category: q.category, similarity: fit,
          importance: a.required ? "REQUIRED" : "IMPORTANT" });
      }
    }
    return { score: observedWeight ? weightedScore / observedWeight : 0,
      coverage: possibleWeight ? observedWeight / possibleWeight : 0, categories, aligned };
  }

  const forward = directional(requesterAnswers, requesterPriorities, targetAnswers);
  const reverse = directional(targetAnswers, targetPriorities, requesterAnswers);
  // Symmetric baseline to evaluate prospectively, not research-derived weights.
  const score = forward.score + reverse.score > 0
    ? 2 * forward.score * reverse.score / (forward.score + reverse.score) : 0;
  const categoryBreakdown = Object.fromEntries(CATEGORIES.map(c => {
    const a = forward.categories[c], b = reverse.categories[c];
    return [c, a.weight + b.weight ? (a.sum + b.sum) / (a.weight + b.weight) : 0];
  })) as Record<QuestionCategory, number>;
  const categoryCoverage = Object.fromEntries(CATEGORIES.map(c => {
    const a = forward.categories[c], b = reverse.categories[c];
    return [c, a.possible + b.possible ? (a.weight + b.weight) / (a.possible + b.possible) : 0];
  })) as Record<QuestionCategory, number>;
  const eligibility = conflicts.size ? "INCOMPATIBLE" : unresolved.size ? "UNRESOLVED" : "ELIGIBLE";
  return { score, percentage: Math.round(score * 100), categoryBreakdown, categoryCoverage,
    alignedPriorities: forward.aligned,
    coverage: Math.min(forward.coverage, reverse.coverage),
    directionalScores: { requester: forward.score, target: reverse.score },
    eligibility, conflictQuestionIds: [...conflicts], unresolvedQuestionIds: [...unresolved],
    questionnaireVersion: QUESTIONNAIRE_VERSION, scoringVersion: SCORING_VERSION };
}
