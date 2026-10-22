const test = require("node:test");
const assert = require("node:assert/strict");
const createLoader = require("./load-typescript.cjs");
const pure = createLoader();
const { PREFERENCE_QUESTIONS } = pure("lib/questionnaire/questions.ts");
const rows = () => PREFERENCE_QUESTIONS.map(q => ({ questionId: q.id,
  value: JSON.stringify({ self: q.options[0], acceptable: q.options, required: false }) }));
const profile = (gender, seeking) => ({ gender, seeking, latitude: null, longitude: null, searchRadius: 50 });

test("discovery scans past its first batch and filters firm conflicts", async () => {
  const current = { id: "me", answers: rows(), priorities: [], profile: profile("male", "women") };
  current.answers.find(a => a.questionId === "v2_future_children").value = JSON.stringify({ self: "Yes", acceptable: ["Yes"], required: true });
  const rejected = { id: "conflict", answers: rows(), priorities: [], profile: profile("female", "men") };
  rejected.answers.find(a => a.questionId === "v2_future_children").value = JSON.stringify({ self: "No", acceptable: ["Yes", "No"], required: false });
  const valid = { id: "late", answers: rows(), priorities: [], profile: profile("female", "men") };
  let pages = 0;
  const first = Array.from({ length: 199 }, (_, i) => ({ ...valid, id: `excluded-${i}`, profile: profile("male", "men") }));
  first.push(rejected);
  const load = createLoader({
    "@/lib/mobile-auth": { getSession: async () => ({ user: { id: "me" } }) },
    "@/lib/prisma": { prisma: { user: { findUnique: async () => current, findMany: async () => ++pages === 1 ? first : [valid] },
      swipe: { findMany: async () => [] } } },
  });
  const data = await (await load("app/api/discover/route.ts").GET({})).json();
  assert.equal(pages, 2);
  assert.deepEqual(data.candidates.map(c => c.id), ["late"]);
});

test("existing users with only old answers receive a questionnaire update prompt", async () => {
  const load = createLoader({
    "@/lib/mobile-auth": { getSession: async () => ({ user: { id: "old" } }) },
    "@/lib/prisma": { prisma: { user: { findUnique: async () => ({ answers: [{ questionId: "q9", value: '"Yes, definitely"' }], priorities: [] }) } } },
  });
  const data = await (await load("app/api/discover/route.ts").GET({})).json();
  assert.equal(data.needsQuestionnaire, true);
  assert.deepEqual(data.candidates, []);
});

test("completed users can reach the preference editor without a redirect loop", () => {
  const proxy = createLoader({ "@/auth": { auth: handler => handler } })("proxy.ts").default;
  for (const route of ["/onboarding/questionnaire", "/onboarding/priorities"]) {
    const response = proxy({ nextUrl: new URL(`http://localhost${route}`), auth: { user: { onboardingStep: "COMPLETE" } } });
    assert.equal(response.headers.get("location"), null);
  }
  const response = proxy({ nextUrl: new URL("http://localhost/onboarding/profile-setup"), auth: { user: { onboardingStep: "COMPLETE" } } });
  assert.equal(response.headers.get("location"), "http://localhost/discover");
});
