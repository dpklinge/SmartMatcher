const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");
const createLoader = require("./load-typescript.cjs");
const pure = createLoader();
const { CONSENT_VERSION, addMonths } = pure("lib/research/contracts.ts");
const { personalityScores, validPersonalityAnswers } = pure("lib/questionnaire/personality.ts");
const { prepareResearchDataset } = pure("lib/research/dataset.ts");
const { feedbackSchema } = pure("lib/research/validation.ts");
const { researchFeatures } = pure("lib/research/features.ts");
const { computeCompatibility } = pure("lib/matching/algorithm.ts");

test("offline pair features are symmetric, versioned, and ignore later reports", () => {
  const fit = computeCompatibility({}, {}, {}, {});
  const personality = JSON.stringify({ version: "mini-ipip-2006-1", answers: Array(20).fill(3) });
  const other = JSON.stringify({ version: "mini-ipip-2006-1", answers: Array(20).fill(4) });
  const values = researchFeatures(fit, [personality, other]);
  assert.deepEqual(values, researchFeatures(fit, [other, personality]));
  assert.equal(values.trait_0_mean, 3);
  assert.equal(values.trait_0_difference, 0);
  assert.equal(values.LIFE_GOALS_alignment, null);
  for (const malformed of [null, "bad JSON", JSON.stringify({ version: "old", answers: Array(20).fill(3) }),
    JSON.stringify({ version: "mini-ipip-2006-1", answers: [3] })]) {
    assert.equal(researchFeatures(fit, [personality, malformed]).trait_0_mean, null);
  }
  assert.ok(!Object.keys(values).some(key => /satisfaction|respect|status|reported/.test(key)));
});

test("Mini-IPIP scoring reverses the correct items and rejects incomplete answers", () => {
  assert.ok(!validPersonalityAnswers(Array(19).fill(3)));
  assert.ok(!validPersonalityAnswers(Array(20).fill(6)));
  assert.deepEqual(Object.values(personalityScores(Array(20).fill(3))), [3, 3, 3, 3, 3]);
  const high = [5, 5, 5, 5, 5, 1, 1, 1, 1, 1, 5, 5, 5, 5, 1, 1, 1, 1, 1, 1];
  assert.deepEqual(Object.values(personalityScores(high)), [5, 5, 5, 5, 5]);
  assert.deepEqual(Object.values(personalityScores(high.map(v => 6 - v))), [1, 1, 1, 1, 1]);
});

test("month checkpoints clamp calendar ends and invalid or inconsistent feedback is rejected", () => {
  assert.equal(addMonths(new Date("2024-01-31T00:00:00Z"), 1).toISOString(), "2024-02-29T00:00:00.000Z");
  const form = { matchId: "match", stage: "AFTER_MEETING", status: "NOT_MET", metAt: null,
    relationshipStartedAt: null, satisfaction: null, respect: null, wantsToContinue: null };
  assert.ok(feedbackSchema.safeParse(form).success);
  for (const value of [{ ...form, satisfaction: 5 }, { ...form, status: "IN_RELATIONSHIP" },
    { ...form, status: "GETTING_TO_KNOW", metAt: "2025-02-30" }, { ...form, otherUserId: "someone" }]) {
    assert.ok(!feedbackSchema.safeParse(value).success);
  }
});

test("research export excludes missing consent, missing meeting evidence, and same-day/post-meeting features", () => {
  const snapshot = userId => ({ userId, capturedAt: new Date("2025-01-01T10:00:00Z"), consentVersion: CONSENT_VERSION,
    questionnaireVersion: 2, scoringVersion: "mutual-preferences-v2", answersJson: "{}", prioritiesJson: "{}", personalityJson: null });
  const report = userId => ({ userId, stage: "AFTER_MEETING", status: "GETTING_TO_KNOW", metAt: new Date("2025-01-02"),
    relationshipStartedAt: null, reportedAt: new Date("2025-01-03"), satisfaction: null, respect: 6, wantsToContinue: "YES" });
  const match = { id: "private-match-id", user1Id: "private-a", user2Id: "private-b", baselines: [snapshot("private-a"), snapshot("private-b")], feedback: [report("private-a"), report("private-b")] };
  const secret = "s".repeat(32), consent = new Set(["private-a", "private-b"]);
  const exported = prepareResearchDataset([match], consent, secret);
  assert.equal(exported.includedPairs, 1);
  assert.equal(exported.schemaVersion, 2);
  assert.equal(exported.pairs[0].baselineMonth, "2025-01");
  assert.equal(exported.pairs[0].participants[0].reports[0].reportedMonth, "2025-01");
  assert.equal(exported.pairs[0].participants[0].reports[0].daysAfterMeeting, 1);
  assert.equal(exported.pairs[0].participants[0].reports[0].checkpointDelayDays, null);
  assert.ok(!JSON.stringify(exported).includes("2025-01-01"));
  assert.ok(!JSON.stringify(exported).includes("private-a"));
  assert.ok(!JSON.stringify(exported).includes("private-match-id"));
  assert.equal(exported.pairs[0].participants[0].reports[0].satisfaction, null);
  assert.equal(prepareResearchDataset([match], new Set(["private-a"]), secret).includedPairs, 0);
  assert.equal(prepareResearchDataset([{ ...match, feedback: [] }], consent, secret).excluded.missingMeetingEvidence, 1);
  const late = { ...snapshot("private-a"), capturedAt: new Date("2025-01-02T01:00:00Z") };
  assert.equal(prepareResearchDataset([{ ...match, baselines: [late, snapshot("private-b")] }], consent, secret).excluded.uncertainTiming, 1);
  assert.throws(() => prepareResearchDataset([match], consent, "short"));
});

test("SQLite research lifecycle: independent opt-in, match-time snapshots, private reports, withdrawal, deletion", async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "matchmaker-research-"));
  const database = path.join(folder, "test.db"); fs.writeFileSync(database, "");
  const url = `file:${database.replaceAll("\\", "/")}`;
  const setup = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "db", "push", "--schema", "prisma/schema.prisma", "--skip-generate"],
    { env: { ...process.env, DATABASE_URL: url }, encoding: "utf8", timeout: 30000 });
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  t.after(async () => {
    await prisma.$disconnect();
    for (const name of fs.readdirSync(folder)) {
      const target = path.resolve(folder, name); assert.equal(path.dirname(target), path.resolve(folder));
      if (fs.statSync(target).isFile()) fs.unlinkSync(target);
    }
    fs.rmdirSync(folder);
  });
  assert.equal(setup.status, 0, `${setup.stdout}\n${setup.stderr}`);
  let actingId = "a";
  const load = createLoader({ "@/lib/prisma": { prisma }, "@/lib/mobile-auth": {
    getSession: async () => actingId ? { user: { id: actingId } } : null,
  } });
  const research = load("app/api/research/route.ts"), followups = load("app/api/research/follow-ups/route.ts");
  const personality = load("app/api/personality/route.ts"), swipe = load("app/api/swipe/route.ts");
  const req = value => ({ json: async () => value });
  for (const id of ["a", "b", "outsider"]) {
    await prisma.user.create({ data: { id, onboardingStep: "COMPLETE", profile: { create: {
      gender: id === "a" ? "male" : "female", seeking: id === "a" ? "women" : "men",
    } } } });
    actingId = id;
    const answers = Object.fromEntries(load("lib/questionnaire/questions.ts").PREFERENCE_QUESTIONS.map(q => [q.id, { self: q.options[0], acceptable: q.options, required: false }]));
    assert.equal((await load("app/api/questionnaire/route.ts").POST(req({ version: 2, answers }))).status, 200);
  }
  actingId = "a";
  assert.equal((await research.POST(req({ enabled: true, policyVersion: "old" }))).status, 400);
  await research.POST(req({ enabled: true, policyVersion: CONSENT_VERSION }));
  assert.equal(await prisma.matchBaseline.count(), 0); // Joining does not backfill.
  assert.equal((await personality.POST(req({ version: "mini-ipip-2006-1", answers: Array(20).fill(3) }))).status, 200);
  await swipe.POST(req({ targetId: "b", direction: "LIKE" })); actingId = "b";
  await swipe.POST(req({ targetId: "a", direction: "LIKE" }));
  let match = await prisma.match.findFirst();
  assert.equal(await prisma.matchBaseline.count(), 1); // Only a opted in.
  assert.equal((await prisma.matchBaseline.findFirst()).userId, "a");
  await research.POST(req({ enabled: true, policyVersion: CONSENT_VERSION }));
  await swipe.POST(req({ targetId: "a", direction: "LIKE" }));
  assert.equal(await prisma.matchBaseline.count(), 1); // Re-swiping must not backfill b.
  await prisma.match.delete({ where: { id: match.id } });
  assert.equal(await prisma.matchBaseline.count(), 0); // Unmatch cascades.
  await swipe.POST(req({ targetId: "a", direction: "LIKE" }));
  match = await prisma.match.findFirst();
  assert.equal(await prisma.matchBaseline.count(), 2);
  assert.ok((await prisma.matchBaseline.findFirst({ where: { userId: "a" } })).personalityJson);
  const form = { matchId: match.id, stage: "AFTER_MEETING", status: "NOT_MET", metAt: null,
    relationshipStartedAt: null, satisfaction: null, respect: null, wantsToContinue: null };
  actingId = "outsider";
  await research.POST(req({ enabled: true, policyVersion: CONSENT_VERSION }));
  assert.equal((await followups.POST(req(form))).status, 404);
  actingId = null;
  assert.equal((await research.GET({})).status, 401);
  actingId = "a";
  assert.equal((await followups.POST(req(form))).status, 200);
  const today = new Date().toISOString().slice(0, 10);
  assert.equal((await followups.POST(req({ ...form, stage: "MONTH_1", status: "IN_RELATIONSHIP", metAt: today, relationshipStartedAt: today }))).status, 400);
  let state = await (await research.GET({})).json();
  assert.equal(state.matches[0].reports.length, 1);
  actingId = "b";
  state = await (await research.GET({})).json();
  assert.equal(state.matches[0].reports.length, 0); // Never reveals a's response.
  const exported = await (await load("app/api/research/export/route.ts").GET({})).json();
  assert.equal(exported.feedback.length, 0);
  assert.equal(exported.baselines.length, 1);
  actingId = "a";
  await personality.DELETE({});
  assert.equal(await prisma.personalityAssessment.count({ where: { userId: "a" } }), 0);
  assert.equal((await prisma.matchBaseline.findFirst({ where: { userId: "a" } })).personalityJson, null);
  await research.POST(req({ enabled: false, policyVersion: CONSENT_VERSION }));
  assert.equal(await prisma.matchBaseline.count({ where: { userId: "a" } }), 0);
  assert.equal(await prisma.relationshipFeedback.count({ where: { userId: "a" } }), 0);
  assert.equal(await prisma.matchBaseline.count({ where: { userId: "b" } }), 1);
  assert.equal((await followups.POST(req(form))).status, 403);
  await research.POST(req({ enabled: true, policyVersion: CONSENT_VERSION }));
  assert.equal(await prisma.matchBaseline.count({ where: { userId: "a" } }), 0);
});
