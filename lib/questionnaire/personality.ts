// Public-domain IPIP items and official Mini-IPIP key: https://ipip.ori.org/MiniIPIPKey.htm
export const PERSONALITY_VERSION = "mini-ipip-2006-1";
export const PERSONALITY_ITEMS = [
  "Am the life of the party.", "Sympathize with others' feelings.", "Get chores done right away.",
  "Have frequent mood swings.", "Have a vivid imagination.", "Don't talk a lot.",
  "Am not interested in other people's problems.", "Often forget to put things back in their proper place.",
  "Am relaxed most of the time.", "Am not interested in abstract ideas.",
  "Talk to a lot of different people at parties.", "Feel others' emotions.", "Like order.",
  "Get upset easily.", "Have difficulty understanding abstract ideas.", "Keep in the background.",
  "Am not really interested in others.", "Make a mess of things.", "Seldom feel blue.", "Do not have a good imagination.",
];
export const PERSONALITY_ANCHORS = ["Very inaccurate", "Moderately inaccurate", "Neither inaccurate nor accurate", "Moderately accurate", "Very accurate"];
export function validPersonalityAnswers(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 20 && value.every(v => Number.isInteger(v) && v >= 1 && v <= 5);
}
export function personalityScores(answers: number[]) {
  if (!validPersonalityAnswers(answers)) throw new Error("Complete all 20 items using the five response options.");
  const mean = (...items: number[]) => items.reduce((sum, item) => sum + (item > 0 ? answers[item - 1] : 6 - answers[-item - 1]), 0) / items.length;
  return { Extraversion: mean(1, -6, 11, -16), Agreeableness: mean(2, -7, 12, -17),
    Conscientiousness: mean(3, -8, 13, -18), "Negative emotionality": mean(4, -9, 14, -19),
    "Intellect / imagination": mean(5, -10, -15, -20) };
}
