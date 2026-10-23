import { createHmac } from "node:crypto";
import { CONSENT_VERSION, addMonths } from "./contracts";
import { QUESTIONNAIRE_VERSION } from "@/lib/questionnaire/questions";
import { SCORING_VERSION, computeCompatibility } from "@/lib/matching/algorithm";
import { researchFeatures } from "./features";

interface Baseline { userId: string; capturedAt: Date; consentVersion: string; questionnaireVersion: number;
  scoringVersion: string; answersJson: string; prioritiesJson: string; personalityJson: string | null; }
interface Report { userId: string; stage: string; status: string; metAt: Date | null; relationshipStartedAt: Date | null;
  satisfaction: number | null; respect: number | null; wantsToContinue: string | null; reportedAt: Date; }
interface ResearchMatch { id: string; user1Id: string; user2Id: string; baselines: Baseline[]; feedback: Report[]; }

/** Strict pre-meeting cohort. Never substitutes missing outcomes with failure. */
export function prepareResearchDataset(matches: ResearchMatch[], consentedIds: Set<string>, secret: string) {
  if (secret.length < 32) throw new Error("Use a research export secret of at least 32 characters.");
  const pseudonym = (kind: string, id: string) => createHmac("sha256", secret).update(`${kind}:${id}`).digest("hex");
  const excluded = { missingConsent: 0, missingBaseline: 0, missingMeetingEvidence: 0, uncertainTiming: 0 };
  const pairs = [];
  for (const match of matches) {
    const ids = [match.user1Id, match.user2Id];
    if (!ids.every(id => consentedIds.has(id))) { excluded.missingConsent++; continue; }
    const baselines = ids.map(id => match.baselines.find(b => b.userId === id && b.consentVersion === CONSENT_VERSION
      && b.questionnaireVersion === QUESTIONNAIRE_VERSION && b.scoringVersion === SCORING_VERSION));
    if (baselines.some(b => !b)) { excluded.missingBaseline++; continue; }
    const meetings = ids.map(id => match.feedback.filter(r => r.userId === id && r.metAt)
      .sort((a, b) => +a.metAt! - +b.metAt!)[0]?.metAt);
    if (meetings.some(d => !d)) { excluded.missingMeetingEvidence++; continue; }
    // Dates have day precision. Same-day ordering is unknowable, so exclude it too.
    if (baselines.some(b => meetings.some(date => b!.capturedAt >= date!))) { excluded.uncertainTiming++; continue; }
    const [a, b] = baselines as [Baseline, Baseline];
    const fit = computeCompatibility(JSON.parse(a.answersJson), JSON.parse(a.prioritiesJson), JSON.parse(b.answersJson), JSON.parse(b.prioritiesJson));
    pairs.push({ pairId: pseudonym("match", match.id), baselineAlignment: fit.score, baselineCoverage: fit.coverage,
      // Coarse cohort month supports later-time evaluation without exact dates.
      baselineMonth: new Date(Math.max(+a.capturedAt, +b.capturedAt)).toISOString().slice(0, 7),
      preMeetingFeatures: researchFeatures(fit, [a.personalityJson, b.personalityJson]),
      questionnaireVersion: QUESTIONNAIRE_VERSION, scoringVersion: SCORING_VERSION,
      participants: (baselines as Baseline[]).map(snapshot => ({ participantId: pseudonym("user", snapshot.userId),
        answers: JSON.parse(snapshot.answersJson), priorities: JSON.parse(snapshot.prioritiesJson),
        personality: snapshot.personalityJson ? JSON.parse(snapshot.personalityJson) : null,
        reports: match.feedback.filter(r => r.userId === snapshot.userId).map(r => ({
          stage: r.stage, status: r.status, satisfaction: r.satisfaction, respect: r.respect,
          wantsToContinue: r.wantsToContinue,
          reportedMonth: r.reportedAt.toISOString().slice(0, 7),
          daysAfterSnapshot: Math.floor((+r.reportedAt - +snapshot.capturedAt) / 86400000),
          daysAfterMeeting: r.metAt ? Math.floor((+r.reportedAt - +r.metAt) / 86400000) : null,
          checkpointDelayDays: r.relationshipStartedAt && /^MONTH_(1|3|6|12)$/.test(r.stage)
            ? Math.floor((+r.reportedAt - +addMonths(r.relationshipStartedAt, Number(r.stage.split("_")[1]))) / 86400000) : null,
          relationshipDays: r.relationshipStartedAt ? Math.floor((+r.reportedAt - +r.relationshipStartedAt) / 86400000) : null,
        })),
      })),
    });
  }
  return { schemaVersion: 2, consentVersion: CONSENT_VERSION, totalMatches: matches.length, includedPairs: pairs.length, excluded,
    limitations: ["Observed matched pairs only; no causal estimate of ranking effectiveness.",
      "Both participants must currently consent and have baselines strictly before both reported meeting dates.",
      "Missing or deleted reports are not failure labels. Keep both participants in the same evaluation fold.",
      "Ratings are experimental outcome items, not a validated clinical scale. No predictive accuracy is claimed."], pairs };
}
