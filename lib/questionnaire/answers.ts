import type { AnswerMap, AnswerValue, PreferenceAnswer, Question } from "@/types/questionnaire";
import { QUESTIONS } from "./questions";

export const PRIVATE_ANSWER = "Prefer not to say";
export const UNKNOWN_ANSWERS = new Set([PRIVATE_ANSWER, "Not sure yet", "No opportunity / not sure"]);

/** Decode database JSON once; already typed values are accepted unchanged. */
export function decodeAnswer(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}

export function isPreferenceAnswer(value: unknown): value is PreferenceAnswer {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && typeof (value as PreferenceAnswer).self === "string"
    && Array.isArray((value as PreferenceAnswer).acceptable)
    && (value as PreferenceAnswer).acceptable.every(v => typeof v === "string")
    && typeof (value as PreferenceAnswer).required === "boolean";
}

export function isValidAnswer(question: Question, value: unknown): value is AnswerValue {
  if (value === null) return !question.required;
  const options = question.options ?? [];
  if (question.type === "PREFERENCE") {
    if (!isPreferenceAnswer(value)) return false;
    const keys = Object.keys(value);
    return keys.length === 3 && keys.every(k => ["self", "acceptable", "required"].includes(k))
      && [...options, PRIVATE_ANSWER].includes(value.self)
      && value.acceptable.length > 0
      && new Set(value.acceptable).size === value.acceptable.length
      && value.acceptable.every(v => options.includes(v));
  }
  if (typeof value === "string" && UNKNOWN_ANSWERS.has(value)) return true;
  switch (question.type) {
    case "SCALE": return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
    case "SINGLE_CHOICE": return typeof value === "string" && options.includes(value);
    case "MULTI_CHOICE":
    case "RANK": return Array.isArray(value) && value.length > 0
      && value.every(v => typeof v === "string" && options.includes(v))
      && new Set(value).size === value.length
      && (question.type !== "RANK" || value.length === options.length);
    default: return false;
  }
}

export function answerMap(rows: { questionId: string; value: string }[]): AnswerMap {
  return Object.fromEntries(rows.map(row => [row.questionId, decodeAnswer(row.value)]));
}

export function missingRequiredAnswers(answers: AnswerMap): string[] {
  return QUESTIONS.filter(q => q.required && !isValidAnswer(q, decodeAnswer(answers[q.id]))).map(q => q.id);
}

export function validateAnswerPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "Answers must be an object.";
  const entries = Object.entries(payload);
  if (!entries.length || entries.length > QUESTIONS.length) return "Provide current questionnaire answers.";
  for (const [id, value] of entries) {
    const question = QUESTIONS.find(q => q.id === id);
    if (!question || !isValidAnswer(question, value)) return `Invalid answer for ${id}.`;
  }
  return null;
}
