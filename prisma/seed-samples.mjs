/**
 * Seeds 10 sample profiles. Three of them (Zoe, Nadia, Elena) receive mutual
 * LIKE swipes with Daniel (danielpklingensmith@gmail.com) so they appear as
 * confirmed matches in the UI.
 *
 * Run: node --env-file=.env.local prisma/seed-samples.mjs
 *
 * Prerequisites: seed.mjs must have been run first (questions must exist).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Charlotte-area coordinates (Charlotte, NC  35.2271° N, 80.8431° W)
const BASE = { lat: 35.2271, lon: -80.8431 };
const jLat = (d) => BASE.lat + d;
const jLon = (d) => BASE.lon + d;

// ─── Inline scoring (mirrors lib/matching/scoring.ts) ─────────────────────────

function scoreScale(a, b) {
  const numA = parseFloat(a), numB = parseFloat(b);
  if (isNaN(numA) || isNaN(numB)) return 0;
  return Math.max(0, 1 - Math.abs(numA - numB) / 4);
}

function scoreSingle(a, b) {
  return a === b ? 1 : 0;
}

function scoreMulti(a, b) {
  try {
    const sa = JSON.parse(a), sb = JSON.parse(b);
    if (!sa.length && !sb.length) return 1;
    const inter = sa.filter((x) => sb.includes(x)).length;
    const union = new Set([...sa, ...sb]).size;
    return union === 0 ? 0 : inter / union;
  } catch {
    return 0;
  }
}

function scoreRank(a, b) {
  try {
    const ra = JSON.parse(a), rb = JSON.parse(b);
    if (ra.length <= 1) return 1;
    const posA = {}, posB = {};
    ra.forEach((x, i) => (posA[x] = i + 1));
    rb.forEach((x, i) => (posB[x] = i + 1));
    const items = ra.filter((x) => x in posB);
    if (items.length <= 1) return 0;
    const m = items.length;
    const relA = {}, relB = {};
    [...items].sort((x, y) => posA[x] - posA[y]).forEach((x, i) => (relA[x] = i + 1));
    [...items].sort((x, y) => posB[x] - posB[y]).forEach((x, i) => (relB[x] = i + 1));
    const dSq = items.reduce((s, x) => s + (relA[x] - relB[x]) ** 2, 0);
    const rho = 1 - (6 * dSq) / (m * (m * m - 1));
    return Math.max(0, Math.min(1, (rho + 1) / 2));
  } catch {
    return 0;
  }
}

/** Compute Daniel's compatibility score toward a target, using his priorities. */
function computeScore(questions, danielAnswers, danielPriorities, targetAnswers) {
  let totalWeighted = 0, totalWeight = 0;
  for (const q of questions) {
    const dAns = danielAnswers[q.id];
    const tAns = targetAnswers[q.id];
    if (!dAns || !tAns) continue;
    const importance = danielPriorities[q.id] ?? "SOMEWHAT_IMPORTANT";
    const weight = importance === "IMPORTANT" ? 1.0 : importance === "NOT_IMPORTANT" ? 0 : 0.5;
    if (weight === 0) continue;
    let sim = 0;
    if (q.type === "SCALE") sim = scoreScale(dAns, tAns);
    else if (q.type === "SINGLE_CHOICE") sim = scoreSingle(dAns, tAns);
    else if (q.type === "MULTI_CHOICE") sim = scoreMulti(dAns, tAns);
    else if (q.type === "RANK") sim = scoreRank(dAns, tAns);
    totalWeighted += sim * weight;
    totalWeight += weight;
  }
  return totalWeight === 0 ? 0 : totalWeighted / totalWeight;
}

// ─── Sample users ─────────────────────────────────────────────────────────────
// _willMatch: true → mutual LIKE swipes + Match record created with Daniel

const SAMPLE_USERS = [
  // ── MATCH 1: Zoe Parker — near-identical values, gaming + arts lover ────────
  {
    email: "zoe.parker.sample@test.dev",
    name: "Zoe Parker",
    _willMatch: true,
    profile: {
      bio: "Indie game developer who spends weekends at museums and co-op gaming sessions. Very introverted but opens up fast once we've had a real conversation.",
      birthDate: new Date("1999-04-12"),
      gender: "female",
      seeking: "men",
      location: "Plaza Midwood, Charlotte NC",
      occupation: "Game Developer",
      education: "BS Computer Science – UNC Charlotte",
      latitude: jLat(0.008),
      longitude: jLon(-0.027),
    },
    answers: {
      introversion_extroversion: 1,
      conflict_style: 1,
      communication_style: "Direct and straightforward",
      spontaneity: 1,
      partner_traits: ["Humor", "Empathy"],
      emotional_expression: 4,
      recharge_style: "Small intimate gatherings",
      vulnerability_comfort: 4,
      children: "Open to it",
      career_ambition: 3,
      ideal_location: "No preference",
      stability_vs_passion: 2,
      life_milestones: ["Marriage", "Career peak", "World travel", "Homeownership", "Parenthood"],
      relationship_timeline: "No rush",
      personal_growth: 4,
      political_views: "Very liberal",
      religion: "Atheist",
      shared_beliefs: 4,
      social_causes: ["Environment & climate", "Social justice", "Animal rights", "Education access", "Healthcare", "Economic equality"],
      honesty: 4,
      gender_roles: "Fully equal partnership",
      family_involvement: 3,
      ethical_choices: 3,
      exercise_frequency: "Once a week",
      diet: "Flexitarian",
      pets: "Open to them",
      physical_intimacy: 3,
      leisure_activities: ["Gaming", "Arts & culture"],
      alcohol: "Occasional social drinker",
      shared_vs_independent: 3,
    },
    priorities: {},
  },

  // ── MATCH 2: Nadia Osei — liberal, agnostic, arts + reading ─────────────────
  {
    email: "nadia.osei.sample@test.dev",
    name: "Nadia Osei",
    _willMatch: true,
    profile: {
      bio: "UX researcher who reads every novel shortlisted for the Booker Prize. I host tiny dinner parties and take long walks with no particular destination.",
      birthDate: new Date("1997-08-03"),
      gender: "female",
      seeking: "men",
      location: "Dilworth, Charlotte NC",
      occupation: "UX Researcher",
      education: "MA Human-Computer Interaction – Georgia Tech",
      latitude: jLat(-0.011),
      longitude: jLon(-0.021),
    },
    answers: {
      introversion_extroversion: 2,
      conflict_style: 2,
      communication_style: "Direct and straightforward",
      spontaneity: 1,
      partner_traits: ["Humor", "Creativity"],
      emotional_expression: 4,
      recharge_style: "Small intimate gatherings",
      vulnerability_comfort: 4,
      children: "Open to it",
      career_ambition: 3,
      ideal_location: "No preference",
      stability_vs_passion: 3,
      life_milestones: ["Marriage", "Career peak", "World travel", "Homeownership", "Parenthood"],
      relationship_timeline: "No rush",
      personal_growth: 4,
      political_views: "Liberal",
      religion: "Agnostic",
      shared_beliefs: 3,
      social_causes: ["Environment & climate", "Social justice", "Animal rights", "Education access"],
      honesty: 4,
      gender_roles: "Fully equal partnership",
      family_involvement: 3,
      ethical_choices: 3,
      exercise_frequency: "Once a week",
      diet: "Flexitarian",
      pets: "Open to them",
      physical_intimacy: 3,
      leisure_activities: ["Arts & culture", "Reading"],
      alcohol: "Occasional social drinker",
      shared_vs_independent: 3,
    },
    priorities: {},
  },

  // ── MATCH 3: Elena Vasquez — very liberal, atheist, arts + reading ──────────
  {
    email: "elena.vasquez.sample@test.dev",
    name: "Elena Vasquez",
    _willMatch: true,
    profile: {
      bio: "Environmental policy analyst by day, watercolor hobbyist by night. I like slow Sundays, thought-provoking films, and farmers' market coffee.",
      birthDate: new Date("1995-11-21"),
      gender: "female",
      seeking: "everyone",
      location: "Myers Park, Charlotte NC",
      occupation: "Environmental Policy Analyst",
      education: "MPP – Duke University",
      latitude: jLat(-0.005),
      longitude: jLon(-0.033),
    },
    answers: {
      introversion_extroversion: 2,
      conflict_style: 2,
      communication_style: "Diplomatic and tactful",
      spontaneity: 1,
      partner_traits: ["Humor", "Creativity"],
      emotional_expression: 4,
      recharge_style: "Small intimate gatherings",
      vulnerability_comfort: 4,
      children: "Open to it",
      career_ambition: 3,
      ideal_location: "No preference",
      stability_vs_passion: 2,
      life_milestones: ["Marriage", "World travel", "Career peak", "Homeownership", "Parenthood"],
      relationship_timeline: "No rush",
      personal_growth: 4,
      political_views: "Very liberal",
      religion: "Atheist",
      shared_beliefs: 4,
      social_causes: ["Environment & climate", "Social justice", "Animal rights", "Education access"],
      honesty: 3,
      gender_roles: "Fully equal partnership",
      family_involvement: 3,
      ethical_choices: 3,
      exercise_frequency: "Once a week",
      diet: "Flexitarian",
      pets: "Open to them",
      physical_intimacy: 3,
      leisure_activities: ["Arts & culture", "Reading"],
      alcohol: "Occasional social drinker",
      shared_vs_independent: 3,
    },
    priorities: {},
  },

  // ── NON-MATCH 4: Tyler Brooks — male, seeking women ─────────────────────────
  {
    email: "tyler.brooks.sample@test.dev",
    name: "Tyler Brooks",
    _willMatch: false,
    profile: {
      bio: "Corporate attorney who unwinds at Panthers games and brewery taprooms. I cook a mean brisket and I'm working on my second half-marathon.",
      birthDate: new Date("1993-06-18"),
      gender: "male",
      seeking: "women",
      location: "Uptown, Charlotte NC",
      occupation: "Corporate Attorney",
      education: "JD – Wake Forest",
      latitude: jLat(0.003),
      longitude: jLon(0.001),
    },
    answers: {
      introversion_extroversion: 7,
      conflict_style: 8,
      communication_style: "Direct and straightforward",
      spontaneity: 6,
      partner_traits: ["Ambition", "Loyalty", "Humor"],
      emotional_expression: 5,
      recharge_style: "Large social events",
      vulnerability_comfort: 4,
      children: "Yes, definitely",
      career_ambition: 9,
      ideal_location: "Big city",
      stability_vs_passion: 3,
      life_milestones: ["Career peak", "Homeownership", "Marriage", "Parenthood", "World travel"],
      relationship_timeline: "Within 1-2 years",
      personal_growth: 7,
      political_views: "Conservative",
      religion: "Actively religious",
      shared_beliefs: 8,
      social_causes: ["Economic equality", "Education access"],
      honesty: 9,
      gender_roles: "Flexible traditional",
      family_involvement: 8,
      ethical_choices: 6,
      exercise_frequency: "Several times a week",
      diet: "Omnivore",
      pets: "Open to them",
      physical_intimacy: 8,
      leisure_activities: ["Sports", "Fitness", "Cooking"],
      alcohol: "Regular drinker",
      shared_vs_independent: 6,
    },
    priorities: { career_ambition: "IMPORTANT", religion: "IMPORTANT", children: "IMPORTANT" },
  },

  // ── NON-MATCH 5: Ashley Kim — female, seeking women ─────────────────────────
  {
    email: "ashley.kim.sample@test.dev",
    name: "Ashley Kim",
    _willMatch: false,
    profile: {
      bio: "Pediatric dentist who rescues senior cats. Weekend hiker, terrible karaoke singer, big fan of dumpling dumplings and dumplings.",
      birthDate: new Date("1996-03-07"),
      gender: "female",
      seeking: "women",
      location: "South End, Charlotte NC",
      occupation: "Pediatric Dentist",
      education: "DMD – UNC Chapel Hill",
      latitude: jLat(-0.016),
      longitude: jLon(0.008),
    },
    answers: {
      introversion_extroversion: 4,
      conflict_style: 5,
      communication_style: "Listening-first",
      spontaneity: 7,
      partner_traits: ["Empathy", "Humor", "Loyalty"],
      emotional_expression: 7,
      recharge_style: "Small intimate gatherings",
      vulnerability_comfort: 8,
      children: "Open to it",
      career_ambition: 6,
      ideal_location: "Big city",
      stability_vs_passion: 6,
      life_milestones: ["Career peak", "World travel", "Homeownership", "Marriage", "Parenthood"],
      relationship_timeline: "No rush",
      personal_growth: 8,
      political_views: "Very liberal",
      religion: "Agnostic",
      shared_beliefs: 5,
      social_causes: ["Healthcare", "Animal rights", "Social justice"],
      honesty: 7,
      gender_roles: "Fully equal partnership",
      family_involvement: 6,
      ethical_choices: 7,
      exercise_frequency: "Several times a week",
      diet: "Omnivore",
      pets: "Love them / have them",
      physical_intimacy: 6,
      leisure_activities: ["Outdoors & nature", "Cooking", "Reading"],
      alcohol: "Occasional social drinker",
      shared_vs_independent: 5,
    },
    priorities: { pets: "IMPORTANT", vulnerability_comfort: "IMPORTANT" },
  },

  // ── NON-MATCH 6: Jordan Rivera — non-binary, seeking everyone, extrovert ────
  {
    email: "jordan.rivera.sample@test.dev",
    name: "Jordan Rivera",
    _willMatch: false,
    profile: {
      bio: "Event photographer with an obsession for live music and spontaneous road trips. If you can keep up, let's go somewhere new this weekend.",
      birthDate: new Date("2001-09-14"),
      gender: "nonbinary",
      seeking: "everyone",
      location: "NoDa, Charlotte NC",
      occupation: "Event Photographer",
      education: "BA Photography – Appalachian State",
      latitude: jLat(0.025),
      longitude: jLon(-0.007),
    },
    answers: {
      introversion_extroversion: 10,
      conflict_style: 6,
      communication_style: "Expressive and emotional",
      spontaneity: 10,
      partner_traits: ["Humor", "Independence", "Creativity"],
      emotional_expression: 9,
      recharge_style: "Large social events",
      vulnerability_comfort: 7,
      children: "No",
      career_ambition: 5,
      ideal_location: "I want to travel/no fixed home",
      stability_vs_passion: 9,
      life_milestones: ["World travel", "Career peak", "Marriage", "Homeownership", "Parenthood"],
      relationship_timeline: "Still figuring it out",
      personal_growth: 8,
      political_views: "Very liberal",
      religion: "Spiritual but not religious",
      shared_beliefs: 3,
      social_causes: ["Social justice", "Environment & climate"],
      honesty: 6,
      gender_roles: "Whatever works for us",
      family_involvement: 3,
      ethical_choices: 6,
      exercise_frequency: "Several times a week",
      diet: "Omnivore",
      pets: "Love them / have them",
      physical_intimacy: 8,
      leisure_activities: ["Arts & culture", "Travel", "Outdoors & nature"],
      alcohol: "Regular drinker",
      shared_vs_independent: 4,
    },
    priorities: { spontaneity: "IMPORTANT" },
  },

  // ── NON-MATCH 7: Rachel Huang — female, seeking men, conservative/religious ─
  {
    email: "rachel.huang.sample@test.dev",
    name: "Rachel Huang",
    _willMatch: false,
    profile: {
      bio: "Nurse practitioner and Sunday school teacher. Family is my anchor. Looking for someone who shares my faith and wants to build something real.",
      birthDate: new Date("1994-01-29"),
      gender: "female",
      seeking: "men",
      location: "Ballantyne, Charlotte NC",
      occupation: "Nurse Practitioner",
      education: "MSN – Queens University of Charlotte",
      latitude: jLat(-0.049),
      longitude: jLon(0.017),
    },
    answers: {
      introversion_extroversion: 5,
      conflict_style: 4,
      communication_style: "Diplomatic and tactful",
      spontaneity: 4,
      partner_traits: ["Loyalty", "Empathy", "Ambition"],
      emotional_expression: 7,
      recharge_style: "Small intimate gatherings",
      vulnerability_comfort: 8,
      children: "Yes, definitely",
      career_ambition: 6,
      ideal_location: "Suburbs",
      stability_vs_passion: 4,
      life_milestones: ["Marriage", "Parenthood", "Homeownership", "Career peak", "World travel"],
      relationship_timeline: "Ready now",
      personal_growth: 7,
      political_views: "Conservative",
      religion: "Actively religious",
      shared_beliefs: 9,
      social_causes: ["Healthcare", "Education access"],
      honesty: 8,
      gender_roles: "Flexible traditional",
      family_involvement: 9,
      ethical_choices: 8,
      exercise_frequency: "Several times a week",
      diet: "Omnivore",
      pets: "Love them / have them",
      physical_intimacy: 6,
      leisure_activities: ["Cooking", "Reading", "Fitness"],
      alcohol: "Don't drink",
      shared_vs_independent: 7,
    },
    priorities: {
      religion: "IMPORTANT",
      children: "IMPORTANT",
      family_involvement: "IMPORTANT",
      relationship_timeline: "IMPORTANT",
      shared_beliefs: "IMPORTANT",
    },
  },

  // ── NON-MATCH 8: Marcus Bell — male, seeking women, outdoorsy ───────────────
  {
    email: "marcus.bell.sample@test.dev",
    name: "Marcus Bell",
    _willMatch: false,
    profile: {
      bio: "Civil engineer who spends every spare weekend trail running or rock climbing. If you can hold a conversation mid-hike, you're already my kind of person.",
      birthDate: new Date("1992-07-05"),
      gender: "male",
      seeking: "women",
      location: "University City, Charlotte NC",
      occupation: "Civil Engineer",
      education: "BS Civil Engineering – NC State",
      latitude: jLat(0.039),
      longitude: jLon(0.016),
    },
    answers: {
      introversion_extroversion: 6,
      conflict_style: 7,
      communication_style: "Direct and straightforward",
      spontaneity: 8,
      partner_traits: ["Humor", "Independence", "Ambition"],
      emotional_expression: 5,
      recharge_style: "Alone time at home",
      vulnerability_comfort: 5,
      children: "Open to it",
      career_ambition: 7,
      ideal_location: "No preference",
      stability_vs_passion: 6,
      life_milestones: ["Career peak", "World travel", "Homeownership", "Marriage", "Parenthood"],
      relationship_timeline: "Within 1-2 years",
      personal_growth: 8,
      political_views: "Moderate",
      religion: "Agnostic",
      shared_beliefs: 4,
      social_causes: ["Environment & climate", "Economic equality"],
      honesty: 7,
      gender_roles: "Fully equal partnership",
      family_involvement: 5,
      ethical_choices: 6,
      exercise_frequency: "Daily",
      diet: "Omnivore",
      pets: "Open to them",
      physical_intimacy: 7,
      leisure_activities: ["Outdoors & nature", "Fitness", "Travel"],
      alcohol: "Occasional social drinker",
      shared_vs_independent: 5,
    },
    priorities: { exercise_frequency: "IMPORTANT", personal_growth: "IMPORTANT" },
  },

  // ── NON-MATCH 9: Skylar Wong — female, seeking men, high-energy extrovert ───
  {
    email: "skylar.wong.sample@test.dev",
    name: "Skylar Wong",
    _willMatch: false,
    profile: {
      bio: "Social media strategist and salsa dance instructor. I thrive at rooftop parties, pop-up dinners, and anywhere there's a crowd and a good beat.",
      birthDate: new Date("2000-05-17"),
      gender: "female",
      seeking: "men",
      location: "South End, Charlotte NC",
      occupation: "Social Media Strategist",
      education: "BS Marketing – Elon University",
      latitude: jLat(-0.013),
      longitude: jLon(0.011),
    },
    answers: {
      introversion_extroversion: 10,
      conflict_style: 6,
      communication_style: "Expressive and emotional",
      spontaneity: 9,
      partner_traits: ["Humor", "Ambition", "Creativity"],
      emotional_expression: 9,
      recharge_style: "Large social events",
      vulnerability_comfort: 6,
      children: "Open to it",
      career_ambition: 7,
      ideal_location: "Big city",
      stability_vs_passion: 7,
      life_milestones: ["World travel", "Career peak", "Marriage", "Homeownership", "Parenthood"],
      relationship_timeline: "Within 1-2 years",
      personal_growth: 8,
      political_views: "Liberal",
      religion: "Spiritual but not religious",
      shared_beliefs: 4,
      social_causes: ["Social justice", "Healthcare", "Education access"],
      honesty: 7,
      gender_roles: "Whatever works for us",
      family_involvement: 6,
      ethical_choices: 5,
      exercise_frequency: "Several times a week",
      diet: "Omnivore",
      pets: "Open to them",
      physical_intimacy: 8,
      leisure_activities: ["Arts & culture", "Travel", "Fitness"],
      alcohol: "Occasional social drinker",
      shared_vs_independent: 7,
    },
    priorities: { spontaneity: "IMPORTANT", emotional_expression: "IMPORTANT" },
  },

  // ── NON-MATCH 10: Sam Delacroix — male, seeking women, outdoors/athletics ───
  {
    email: "sam.delacroix.sample@test.dev",
    name: "Sam Delacroix",
    _willMatch: false,
    profile: {
      bio: "High-school soccer coach and weekend kayaker. I believe in showing up early, cooking from scratch, and never skipping leg day.",
      birthDate: new Date("1991-12-03"),
      gender: "male",
      seeking: "women",
      location: "Steele Creek, Charlotte NC",
      occupation: "PE Teacher / Soccer Coach",
      education: "BS Physical Education – App State",
      latitude: jLat(-0.033),
      longitude: jLon(-0.041),
    },
    answers: {
      introversion_extroversion: 7,
      conflict_style: 5,
      communication_style: "Direct and straightforward",
      spontaneity: 7,
      partner_traits: ["Loyalty", "Humor", "Ambition"],
      emotional_expression: 6,
      recharge_style: "Small intimate gatherings",
      vulnerability_comfort: 5,
      children: "Yes, definitely",
      career_ambition: 5,
      ideal_location: "Suburbs",
      stability_vs_passion: 5,
      life_milestones: ["Marriage", "Parenthood", "Homeownership", "Career peak", "World travel"],
      relationship_timeline: "Ready now",
      personal_growth: 7,
      political_views: "Moderate",
      religion: "Spiritual but not religious",
      shared_beliefs: 5,
      social_causes: ["Education access", "Healthcare"],
      honesty: 7,
      gender_roles: "Fully equal partnership",
      family_involvement: 7,
      ethical_choices: 5,
      exercise_frequency: "Daily",
      diet: "Omnivore",
      pets: "Love them / have them",
      physical_intimacy: 7,
      leisure_activities: ["Sports", "Outdoors & nature", "Cooking"],
      alcohol: "Occasional social drinker",
      shared_vs_independent: 6,
    },
    priorities: { children: "IMPORTANT", family_involvement: "IMPORTANT" },
  },
];

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Verify questions exist
  const questions = await prisma.question.findMany({ orderBy: { order: "asc" } });
  if (questions.length === 0) {
    console.error("No questions found — run `node --env-file=.env.local prisma/seed.mjs` first.");
    process.exit(1);
  }
  const qByKey = Object.fromEntries(questions.map((q) => [q.key, q]));

  // 2. Load Daniel's answers and priorities for score computation
  const daniel = await prisma.user.findUnique({
    where: { email: "danielpklingensmith@gmail.com" },
    include: {
      answers: true,
      priorities: true,
    },
  });
  if (!daniel) {
    console.error("Test account danielpklingensmith@gmail.com not found — cannot create matches.");
    process.exit(1);
  }
  const danielAnswerMap = Object.fromEntries(daniel.answers.map((a) => [a.questionId, a.value]));
  const danielPriorityMap = Object.fromEntries(daniel.priorities.map((p) => [p.questionId, p.importance]));

  console.log(`Found test account: ${daniel.name} (${daniel.id})\n`);

  // 3. Seed each sample user
  for (const userData of SAMPLE_USERS) {
    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { name: userData.name, onboardingStep: "COMPLETE" },
      create: { email: userData.email, name: userData.name, onboardingStep: "COMPLETE" },
    });

    // Upsert profile
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: { ...userData.profile },
      create: { userId: user.id, ...userData.profile },
    });

    // Build target answer map for score computation
    const targetAnswerMap = {};

    // Upsert answers
    for (const [key, value] of Object.entries(userData.answers)) {
      const q = qByKey[key];
      if (!q) continue;
      const serialized = JSON.stringify(value);
      await prisma.questionnaireAnswer.upsert({
        where: { userId_questionId: { userId: user.id, questionId: q.id } },
        update: { value: serialized },
        create: { userId: user.id, questionId: q.id, value: serialized },
      });
      targetAnswerMap[q.id] = serialized;
    }

    // Upsert priorities
    for (const q of questions) {
      const importance = userData.priorities[q.key] ?? "SOMEWHAT_IMPORTANT";
      await prisma.answerPriority.upsert({
        where: { userId_questionId: { userId: user.id, questionId: q.id } },
        update: { importance },
        create: { userId: user.id, questionId: q.id, importance },
      });
    }

    // 4. Create mutual swipes + match for the 3 matching users
    if (userData._willMatch) {
      const score = computeScore(questions, danielAnswerMap, danielPriorityMap, targetAnswerMap);

      // Daniel → sample user (LIKE)
      await prisma.swipe.upsert({
        where: { actorId_targetId: { actorId: daniel.id, targetId: user.id } },
        update: { direction: "LIKE" },
        create: { actorId: daniel.id, targetId: user.id, direction: "LIKE" },
      });

      // Sample user → Daniel (LIKE)
      await prisma.swipe.upsert({
        where: { actorId_targetId: { actorId: user.id, targetId: daniel.id } },
        update: { direction: "LIKE" },
        create: { actorId: user.id, targetId: daniel.id, direction: "LIKE" },
      });

      // Match record (user IDs sorted to satisfy @@unique constraint)
      const [u1, u2] = [daniel.id, user.id].sort();
      await prisma.match.upsert({
        where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
        update: { score },
        create: { user1Id: u1, user2Id: u2, score },
      });

      // Cache the compatibility score
      await prisma.compatibilityCache.upsert({
        where: { requesterId_targetId: { requesterId: daniel.id, targetId: user.id } },
        update: { score, breakdown: "{}", computedAt: new Date() },
        create: { requesterId: daniel.id, targetId: user.id, score, breakdown: "{}" },
      });

      console.log(`  ✓ ${userData.name} — MATCHED (score: ${Math.round(score * 100)}%)`);
    } else {
      console.log(`  · ${userData.name} — created (no match)`);
    }
  }

  console.log(`\nDone. Seeded ${SAMPLE_USERS.length} sample profiles (3 matches with ${daniel.name}).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
