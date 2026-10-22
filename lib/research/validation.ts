import { z } from "zod";
import { STAGES, STATUS_LABELS } from "./contracts";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01";
}, "Enter a real calendar date.").nullable();
const rating = z.number().int().min(1).max(7).nullable();
export const feedbackSchema = z.object({
  matchId: z.string().min(1).max(100), stage: z.enum(STAGES),
  status: z.enum(Object.keys(STATUS_LABELS) as [keyof typeof STATUS_LABELS, ...(keyof typeof STATUS_LABELS)[]]),
  metAt: day, relationshipStartedAt: day, satisfaction: rating, respect: rating,
  wantsToContinue: z.enum(["YES", "NO", "UNSURE"]).nullable(),
}).strict().superRefine((value, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  const today = new Date().toISOString().slice(0, 10);
  if ((value.metAt && value.metAt > today) || (value.relationshipStartedAt && value.relationshipStartedAt > today)) issue("Dates cannot be in the future.");
  if (value.status === "NOT_MET") {
    if (value.metAt || value.relationshipStartedAt || value.satisfaction !== null || value.respect !== null || value.wantsToContinue !== null) issue("A not-yet-met check-in cannot include relationship ratings or dates.");
  } else if (!value.metAt) issue("Enter the date you first met.");
  if (value.status === "IN_RELATIONSHIP" && !value.relationshipStartedAt) issue("Enter when your relationship began.");
  if (value.status === "GETTING_TO_KNOW" && value.relationshipStartedAt) issue("A relationship start date only applies to a relationship or an ended relationship.");
  if (value.relationshipStartedAt && value.metAt && value.relationshipStartedAt < value.metAt) issue("The relationship start date cannot precede the first meeting.");
});
