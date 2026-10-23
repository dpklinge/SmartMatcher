import type { CompatibilityResult } from "@/types/matching";
import { PERSONALITY_VERSION, personalityScores, validPersonalityAnswers } from "@/lib/questionnaire/personality";

/** Audited, symmetric pre-meeting inputs for offline ablations, never live ranking. */
export function researchFeatures(fit: CompatibilityResult, personality: (string | null)[]) {
  const values: Record<string, number | null> = {
    alignment: fit.score, coverage: fit.coverage,
    directional_min: Math.min(fit.directionalScores.requester, fit.directionalScores.target),
    directional_max: Math.max(fit.directionalScores.requester, fit.directionalScores.target),
  };
  for (const category of ["LIFE_GOALS", "VALUES_AND_BELIEFS", "LIFESTYLE"] as const) {
    values[`${category}_alignment`] = fit.categoryCoverage[category] > 0 ? fit.categoryBreakdown[category] : null;
    values[`${category}_coverage`] = fit.categoryCoverage[category];
  }
  const traits = personality.map(raw => {
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data.version === PERSONALITY_VERSION && validPersonalityAnswers(data.answers) ? Object.values(personalityScores(data.answers)) : null;
    } catch { return null; }
  });
  // Pair mean and difference are competing hypotheses, not assumed compatibility.
  for (let i = 0; i < 5; i++) {
    const a = traits[0]?.[i], b = traits[1]?.[i];
    values[`trait_${i}_mean`] = a !== undefined && b !== undefined ? (a + b) / 2 : null;
    values[`trait_${i}_difference`] = a !== undefined && b !== undefined ? Math.abs(a - b) : null;
  }
  return values;
}
