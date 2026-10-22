export interface FeedbackForm {
  matchId: string; stage: string; status: string; metAt: string | null; relationshipStartedAt: string | null;
  satisfaction: number | null; respect: number | null; wantsToContinue: string | null;
}
export interface ResearchState {
  consent: { enabled: boolean; policyVersion: string };
  matches: { id: string; name: string; reports: FeedbackForm[];
    checkpoints: { stage: string; available: boolean; dueAt: string | null }[] }[];
}
export const STAGE_LABELS: Record<string, string> = { AFTER_MEETING: "First check-in", MONTH_1: "One month", MONTH_3: "Three months", MONTH_6: "Six months", MONTH_12: "Twelve months" };
export const STATUS_LABELS: Record<string, string> = { NOT_MET: "We have not met", GETTING_TO_KNOW: "We met and are getting to know each other", IN_RELATIONSHIP: "We are in a relationship", ENDED: "We stopped seeing each other" };
