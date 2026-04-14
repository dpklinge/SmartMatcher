import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const QUESTIONS = [
  { id: "q1", key: "introversion_extroversion", category: "PERSONALITY", text: "How would you describe yourself on the introvert\u2013extrovert spectrum?", type: "SCALE", minLabel: "Very introverted", maxLabel: "Very extroverted", order: 1 },
  { id: "q2", key: "conflict_style", category: "PERSONALITY", text: "How do you typically handle conflict in a relationship?", type: "SCALE", minLabel: "Avoid it entirely", maxLabel: "Address it immediately", order: 2 },
  { id: "q3", key: "communication_style", category: "PERSONALITY", text: "What best describes your communication style?", type: "SINGLE_CHOICE", options: ["Direct and straightforward", "Diplomatic and tactful", "Listening-first", "Expressive and emotional"], order: 3 },
  { id: "q4", key: "spontaneity", category: "PERSONALITY", text: "How important is spontaneity and unplanned adventures in your daily life?", type: "SCALE", minLabel: "Prefer routines", maxLabel: "Love spontaneity", order: 4 },
  { id: "q5", key: "partner_traits", category: "PERSONALITY", text: "Which traits do you value most in a partner? (Select all that apply)", type: "MULTI_CHOICE", options: ["Humor", "Ambition", "Empathy", "Creativity", "Loyalty", "Independence"], order: 5 },
  { id: "q6", key: "emotional_expression", category: "PERSONALITY", text: "How emotionally expressive are you in relationships?", type: "SCALE", minLabel: "Very reserved", maxLabel: "Openly expressive", order: 6 },
  { id: "q7", key: "recharge_style", category: "PERSONALITY", text: "How do you recharge after a long week?", type: "SINGLE_CHOICE", options: ["Alone time at home", "Small intimate gatherings", "Large social events", "Doesn't matter to me"], order: 7 },
  { id: "q8", key: "vulnerability_comfort", category: "PERSONALITY", text: "How comfortable are you with emotional vulnerability in a relationship?", type: "SCALE", minLabel: "Very uncomfortable", maxLabel: "Very comfortable", order: 8 },
  { id: "q9", key: "children", category: "LIFE_GOALS", text: "Do you want children?", type: "SINGLE_CHOICE", options: ["Yes, definitely", "Open to it", "No", "Already have children"], order: 9 },
  { id: "q10", key: "career_ambition", category: "LIFE_GOALS", text: "How important is career advancement to you?", type: "SCALE", minLabel: "Work to live", maxLabel: "Career is central", order: 10 },
  { id: "q11", key: "ideal_location", category: "LIFE_GOALS", text: "Where do you see yourself living long-term?", type: "SINGLE_CHOICE", options: ["Big city", "Suburbs", "Small town or rural", "No preference", "I want to travel/no fixed home"], order: 11 },
  { id: "q12", key: "stability_vs_passion", category: "LIFE_GOALS", text: "How do you balance financial stability vs. following your passion?", type: "SCALE", minLabel: "Stability above all", maxLabel: "Passion above all", order: 12 },
  { id: "q13", key: "life_milestones", category: "LIFE_GOALS", text: "Rank these life milestones by personal priority (most important first):", type: "RANK", options: ["Marriage", "Career peak", "World travel", "Homeownership", "Parenthood"], order: 13 },
  { id: "q14", key: "relationship_timeline", category: "LIFE_GOALS", text: "What is your timeline for a serious, committed relationship?", type: "SINGLE_CHOICE", options: ["Ready now", "Within 1-2 years", "No rush", "Still figuring it out"], order: 14 },
  { id: "q15", key: "personal_growth", category: "LIFE_GOALS", text: "How much do you value continuous personal growth and self-improvement?", type: "SCALE", minLabel: "Comfortable as I am", maxLabel: "Always striving to grow", order: 15 },
  { id: "q16", key: "political_views", category: "VALUES_AND_BELIEFS", text: "How would you describe your political views?", type: "SINGLE_CHOICE", options: ["Very liberal", "Liberal", "Moderate", "Conservative", "Very conservative", "Prefer not to say"], order: 16 },
  { id: "q17", key: "religion", category: "VALUES_AND_BELIEFS", text: "What is your religious or spiritual stance?", type: "SINGLE_CHOICE", options: ["Actively religious", "Spiritual but not religious", "Agnostic", "Atheist", "Prefer not to say"], order: 17 },
  { id: "q18", key: "shared_beliefs", category: "VALUES_AND_BELIEFS", text: "How important is it that your partner shares your beliefs and values?", type: "SCALE", minLabel: "Not important", maxLabel: "Essential", order: 18 },
  { id: "q19", key: "social_causes", category: "VALUES_AND_BELIEFS", text: "Which social causes matter most to you? (Select all that apply)", type: "MULTI_CHOICE", options: ["Environment & climate", "Social justice", "Animal rights", "Education access", "Healthcare", "Economic equality"], order: 19 },
  { id: "q20", key: "honesty", category: "VALUES_AND_BELIEFS", text: "How important is radical honesty, even when it is uncomfortable?", type: "SCALE", minLabel: "Kindness over bluntness", maxLabel: "Honesty always", order: 20 },
  { id: "q21", key: "gender_roles", category: "VALUES_AND_BELIEFS", text: "What is your view on gender roles in a relationship?", type: "SINGLE_CHOICE", options: ["Traditional roles", "Flexible traditional", "Fully equal partnership", "Whatever works for us", "No strong opinion"], order: 21 },
  { id: "q22", key: "family_involvement", category: "VALUES_AND_BELIEFS", text: "How important is family and community involvement in your life?", type: "SCALE", minLabel: "Very independent", maxLabel: "Family is everything", order: 22 },
  { id: "q23", key: "ethical_choices", category: "VALUES_AND_BELIEFS", text: "How much do ethical considerations influence your daily choices?", type: "SCALE", minLabel: "Rarely think about it", maxLabel: "Guide every decision", order: 23 },
  { id: "q24", key: "exercise_frequency", category: "LIFESTYLE", text: "How often do you exercise?", type: "SINGLE_CHOICE", options: ["Daily", "Several times a week", "Once a week", "Rarely", "Never"], order: 24 },
  { id: "q25", key: "diet", category: "LIFESTYLE", text: "How would you describe your diet?", type: "SINGLE_CHOICE", options: ["Omnivore", "Flexitarian", "Vegetarian", "Vegan", "Other"], order: 25 },
  { id: "q26", key: "pets", category: "LIFESTYLE", text: "How do you feel about pets?", type: "SINGLE_CHOICE", options: ["Love them / have them", "Open to them", "Allergic or prefer no pets"], order: 26 },
  { id: "q27", key: "physical_intimacy", category: "LIFESTYLE", text: "How important is physical intimacy in a relationship?", type: "SCALE", minLabel: "Not very important", maxLabel: "Very important", order: 27 },
  { id: "q28", key: "leisure_activities", category: "LIFESTYLE", text: "What are your primary leisure activities? (Select all that apply)", type: "MULTI_CHOICE", options: ["Outdoors & nature", "Arts & culture", "Sports", "Gaming", "Travel", "Cooking", "Reading", "Fitness"], order: 28 },
  { id: "q29", key: "alcohol", category: "LIFESTYLE", text: "What is your relationship with alcohol?", type: "SINGLE_CHOICE", options: ["Don't drink", "Occasional social drinker", "Regular drinker", "Prefer a non-drinking partner"], order: 29 },
  { id: "q30", key: "shared_vs_independent", category: "LIFESTYLE", text: "How much do you value shared activities vs. maintaining independent hobbies?", type: "SCALE", minLabel: "Mostly independent", maxLabel: "Everything together", order: 30 },
];

async function main() {
  console.log("Seeding questions...");
  for (const q of QUESTIONS) {
    await prisma.question.upsert({
      where: { key: q.key },
      update: { category: q.category, text: q.text, type: q.type, options: q.options ? JSON.stringify(q.options) : null, minLabel: q.minLabel ?? null, maxLabel: q.maxLabel ?? null, order: q.order },
      create: { id: q.id, key: q.key, category: q.category, text: q.text, type: q.type, options: q.options ? JSON.stringify(q.options) : null, minLabel: q.minLabel ?? null, maxLabel: q.maxLabel ?? null, order: q.order },
    });
  }
  console.log(`Seeded ${QUESTIONS.length} questions.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
