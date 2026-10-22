export const CONSENT_VERSION = "2026-10-22.1";
export const STAGES = ["AFTER_MEETING", "MONTH_1", "MONTH_3", "MONTH_6", "MONTH_12"] as const;
export type Stage = typeof STAGES[number];
export const STATUS_LABELS = {
  NOT_MET: "We have not met", GETTING_TO_KNOW: "We met and are getting to know each other",
  IN_RELATIONSHIP: "We are in a relationship", ENDED: "We stopped seeing each other",
} as const;
export const STAGE_LABELS: Record<Stage, string> = {
  AFTER_MEETING: "First check-in", MONTH_1: "One month", MONTH_3: "Three months",
  MONTH_6: "Six months", MONTH_12: "Twelve months",
};
export interface FeedbackInput {
  matchId: string; stage: Stage; status: keyof typeof STATUS_LABELS;
  metAt: string | null; relationshipStartedAt: string | null;
  satisfaction: number | null; respect: number | null;
  wantsToContinue: "YES" | "NO" | "UNSURE" | null;
}
export interface FeedbackRecord extends Omit<FeedbackInput, "metAt" | "relationshipStartedAt"> {
  metAt: Date | string | null; relationshipStartedAt: Date | string | null;
  reportedAt: Date | string;
}
export interface ResearchState {
  consent: { enabled: boolean; policyVersion: string };
  matches: { id: string; name: string; reports: FeedbackRecord[];
    checkpoints: { stage: Stage; dueAt: string | null; available: boolean }[] }[];
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function checkpoints(reports: Pick<FeedbackRecord, "relationshipStartedAt" | "reportedAt">[], now = new Date()) {
  const start = [...reports].sort((a, b) => +new Date(b.reportedAt) - +new Date(a.reportedAt))
    .find(r => r.relationshipStartedAt)?.relationshipStartedAt;
  return STAGES.map(stage => {
    const months = stage === "AFTER_MEETING" ? 0 : Number(stage.split("_")[1]);
    const due = months && start ? addMonths(new Date(start), months) : null;
    return { stage, dueAt: due?.toISOString() ?? null,
      available: stage === "AFTER_MEETING" || !!(due && due <= now) };
  });
}
