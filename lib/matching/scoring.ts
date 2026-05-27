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
    if (rankA.length <= 1) return 1;

    const posA: Record<string, number> = {};
    const posB: Record<string, number> = {};
    rankA.forEach((item, i) => (posA[item] = i + 1));
    rankB.forEach((item, i) => (posB[item] = i + 1));

    const items = rankA.filter((item) => item in posB);
    if (items.length <= 1) return 0;

    const m = items.length;

    // Re-rank the overlapping items 1..m by their relative order in each list.
    // Using raw positions from a longer list would make Σd² exceed the formula's
    // theoretical maximum, producing rho < -1 and a negative mapped score.
    const relA: Record<string, number> = {};
    const relB: Record<string, number> = {};
    [...items].sort((x, y) => posA[x] - posA[y]).forEach((item, i) => { relA[item] = i + 1; });
    [...items].sort((x, y) => posB[x] - posB[y]).forEach((item, i) => { relB[item] = i + 1; });

    const dSquaredSum = items.reduce((sum, item) => {
      const d = relA[item] - relB[item];
      return sum + d * d;
    }, 0);

    const rho = 1 - (6 * dSquaredSum) / (m * (m * m - 1));
    // Map [-1, 1] → [0, 1]; clamp guards against any floating-point edge cases.
    return Math.max(0, Math.min(1, (rho + 1) / 2));
  } catch {
    return 0;
  }
}
