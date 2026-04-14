import type { QuestionType } from "@/types/questionnaire";

/**
 * Returns a similarity score in [0, 1] between two answers to the same question.
 */
export function scoreSimilarity(
  type: QuestionType,
  valueA: string,
  valueB: string
): number {
  switch (type) {
    case "SCALE":
      return scoreScale(valueA, valueB);
    case "SINGLE_CHOICE":
      return scoreSingleChoice(valueA, valueB);
    case "MULTI_CHOICE":
      return scoreMultiChoice(valueA, valueB);
    case "RANK":
      return scoreRank(valueA, valueB);
    default:
      return 0;
  }
}

/** 1-5 integer scale — linear distance */
function scoreScale(a: string, b: string): number {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  if (isNaN(numA) || isNaN(numB)) return 0;
  const diff = Math.abs(numA - numB);
  const maxDiff = 4; // range 1-5
  return 1 - diff / maxDiff;
}

/** Exact match */
function scoreSingleChoice(a: string, b: string): number {
  return a === b ? 1 : 0;
}

/**
 * Jaccard similarity for sets.
 * Values are stored as JSON arrays: '["Humor","Empathy"]'
 */
function scoreMultiChoice(a: string, b: string): number {
  try {
    const setA: string[] = JSON.parse(a);
    const setB: string[] = JSON.parse(b);
    if (!setA.length && !setB.length) return 1;
    const intersection = setA.filter((x) => setB.includes(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  } catch {
    return 0;
  }
}

/**
 * Spearman rank correlation mapped to [0, 1].
 * Values are stored as JSON arrays in ranked order: '["Marriage","Travel",...]'
 */
function scoreRank(a: string, b: string): number {
  try {
    const rankA: string[] = JSON.parse(a);
    const rankB: string[] = JSON.parse(b);
    const n = rankA.length;
    if (n <= 1) return 1;

    const posA: Record<string, number> = {};
    const posB: Record<string, number> = {};
    rankA.forEach((item, i) => (posA[item] = i + 1));
    rankB.forEach((item, i) => (posB[item] = i + 1));

    const items = rankA.filter((item) => item in posB);
    if (items.length <= 1) return 0;

    const m = items.length;
    const dSquaredSum = items.reduce((sum, item) => {
      const d = posA[item] - posB[item];
      return sum + d * d;
    }, 0);

    const rho = 1 - (6 * dSquaredSum) / (m * (m * m - 1));
    // Map from [-1, 1] to [0, 1]
    return (rho + 1) / 2;
  } catch {
    return 0;
  }
}
