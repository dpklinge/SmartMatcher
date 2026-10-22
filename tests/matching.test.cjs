const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-typescript.cjs")();
const { computeCompatibility } = load("lib/matching/algorithm.ts");
const { QUESTIONS, PREFERENCE_QUESTIONS } = load("lib/questionnaire/questions.ts");
const { answerMap, isValidAnswer, missingRequiredAnswers, validateAnswerPayload } = load("lib/questionnaire/answers.ts");
const { profilesAreMutuallyEligible } = load("lib/matching/eligibility.ts");
const answer = (self, acceptable = [self], required = false) => ({ self, acceptable, required });
const complete = () => Object.fromEntries(PREFERENCE_QUESTIONS.map(q => [q.id, answer(q.options[0], [...q.options])]));
const score = (a, b, pa = {}, pb = {}) => computeCompatibility(a, pa, b, pb);

test("a firm parenting conflict cannot be averaged away by agreement elsewhere", () => {
  const a = complete(), b = complete();
  a.v2_future_children = answer("Yes", ["Yes"], true);
  b.v2_future_children = answer("No", ["Yes", "No"]);
  const result = score(a, b);
  assert.equal(result.eligibility, "INCOMPATIBLE");
  assert.ok(result.score > .9);
  assert.deepEqual(result.conflictQuestionIds, ["v2_future_children"]);
});

test("both people's requirements apply, even if the requester says not important", () => {
  const a = complete(), b = complete();
  a.v2_alcohol = answer("Weekly", ["Do not drink", "Weekly"]);
  b.v2_alcohol = answer("Do not drink", ["Do not drink"], true);
  assert.equal(score(a, b, { v2_alcohol: "NOT_IMPORTANT" }, { v2_alcohol: "NOT_IMPORTANT" }).eligibility, "INCOMPATIBLE");
});

test("different but mutually acceptable answers are fully aligned", () => {
  const a = complete(), b = complete();
  a.v2_alcohol = answer("Weekly", ["Do not drink"]);
  b.v2_alcohol = answer("Do not drink", ["Weekly"]);
  assert.equal(score(a, b).score, 1);
});

test("private, missing, and undecided required answers remain unresolved", () => {
  for (const value of [undefined, null, answer("Prefer not to say", ["Yes"]), answer("Not sure yet", ["Yes"])]) {
    const a = complete(), b = complete();
    a.v2_future_children = answer("Yes", ["Yes"], true);
    b.v2_future_children = value;
    assert.equal(score(a, b).eligibility, "UNRESOLVED");
    assert.ok(score(a, b).coverage < 1);
  }
});

test("matching private answers do not count as agreement", () => {
  const a = { v2_future_children: answer("Prefer not to say", ["Yes"]) };
  const result = score(a, a);
  assert.equal(result.score, 0);
  assert.equal(result.coverage, 0);
});

test("pair score is symmetric and incorporates both sets of priorities", () => {
  const a = complete(), b = complete();
  a.v2_alcohol = answer("Weekly", ["Weekly"]);
  const pa = { v2_alcohol: "IMPORTANT" }, pb = { v2_alcohol: "NOT_IMPORTANT" };
  assert.equal(score(a, b, pa, pb).score, score(b, a, pb, pa).score);
  assert.notEqual(score(a, b, pa, pb).directionalScores.requester, score(a, b, pa, pb).directionalScores.target);
});

test("stored JSON and decoded answers produce identical results", () => {
  const a = complete(), b = complete();
  const stored = Object.fromEntries(Object.entries(a).map(([id, value]) => [id, JSON.stringify(value)]));
  assert.deepEqual(score(stored, b), score(a, b));
  assert.deepEqual(answerMap(Object.entries(stored).map(([questionId, value]) => ({ questionId, value }))), a);
});

test("experimental behavior and historical answers do not affect ranking", () => {
  const a = complete(), b = complete();
  const baseline = score(a, b);
  a.v2_regulation = "Never"; b.v2_regulation = "Almost always";
  a.q2 = 1; b.q2 = 1;
  assert.deepEqual(score(a, b), baseline);
  assert.equal(score({ q2: 1 }, { q2: 1 }).coverage, 0);
});

test("sparse evidence is distinguishable from complete alignment", () => {
  const a = { v2_alcohol: answer("Do not drink") };
  assert.equal(score(a, a).score, 1);
  assert.ok(score(a, a).coverage < .1);
  assert.equal(score(complete(), complete()).coverage, 1);
});

test("validation rejects malformed, stale, and partial answer payloads", () => {
  assert.equal(validateAnswerPayload(complete()), null);
  for (const payload of [null, [], {}, { q9: "Already have children" },
    { v2_alcohol: { self: "Weekly", acceptable: [], required: true } },
    { v2_alcohol: { self: "Made up", acceptable: ["Weekly"], required: true } },
    { v2_alcohol: { self: "Weekly", acceptable: ["Weekly", "Weekly"], required: false } },
    { v2_alcohol: { self: "Weekly", acceptable: ["Weekly"], required: "yes" } }]) {
    assert.ok(validateAnswerPayload(payload));
  }
  assert.equal(missingRequiredAnswers({}).length, 6);
  assert.deepEqual(missingRequiredAnswers(complete()), []);
  assert.equal(isValidAnswer(QUESTIONS.find(q => q.id === "v2_intimacy"), null), true);
  assert.equal(isValidAnswer(QUESTIONS.find(q => q.id === "v2_future_children"), null), false);
});

test("partner seeking and distance must work in both directions", () => {
  const a = { gender: "female", seeking: "men", latitude: 40, longitude: -74, searchRadius: 100 };
  const b = { gender: "male", seeking: "women", latitude: 40.2, longitude: -74, searchRadius: 50 };
  assert.equal(profilesAreMutuallyEligible(a, b), true);
  assert.equal(profilesAreMutuallyEligible(a, { ...b, seeking: "men" }), false);
  assert.equal(profilesAreMutuallyEligible(a, { ...b, searchRadius: 1 }), false);
  assert.equal(profilesAreMutuallyEligible(a, null), false);
});
