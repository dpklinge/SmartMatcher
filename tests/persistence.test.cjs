const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");
const createLoader = require("./load-typescript.cjs");

test("SQLite integration: new catalog, legacy preservation, completion, mutual matching, invalidation", async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "matchmaker-v2-test-"));
  const database = path.join(folder, "integration.db");
  fs.writeFileSync(database, "");
  const url = `file:${database.replaceAll("\\", "/")}`;
  const result = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "db", "push", "--schema", "prisma/schema.prisma", "--skip-generate"], {
    cwd: path.resolve(__dirname, ".."), env: { ...process.env, DATABASE_URL: url }, encoding: "utf8", timeout: 30000,
  });
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  t.after(async () => {
    await prisma.$disconnect();
    // Remove only files created inside this specific temporary test directory.
    for (const name of fs.readdirSync(folder)) {
      const target = path.resolve(folder, name);
      assert.equal(path.dirname(target), path.resolve(folder));
      if (fs.statSync(target).isFile()) fs.unlinkSync(target);
    }
    fs.rmdirSync(folder);
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  let actingId = "a";
  const load = createLoader({ "@/lib/prisma": { prisma },
    "@/lib/mobile-auth": { getSession: async () => ({ user: { id: actingId } }) } });
  const { PREFERENCE_QUESTIONS } = load("lib/questionnaire/questions.ts");
  const { getPairCompatibility } = load("lib/matching/service.ts");
  const questionnaire = load("app/api/questionnaire/route.ts");
  const priorities = load("app/api/priorities/route.ts");
  const discovery = load("app/api/discover/route.ts");
  const req = body => ({ json: async () => body });
  for (const id of ["a", "b"]) {
    await prisma.user.create({ data: { id, onboardingStep: "QUESTIONNAIRE",
      profile: { create: { gender: id === "a" ? "male" : "female", seeking: id === "a" ? "women" : "men" } } } });
  }
  await prisma.question.create({ data: { id: "q9", key: "children", category: "LIFE_GOALS", text: "Do you want children?", type: "SINGLE_CHOICE", order: 9 } });
  await prisma.questionnaireAnswer.create({ data: { userId: "a", questionId: "q9", value: '"Already have children"' } });
  assert.equal((await load("app/api/questionnaire/complete/route.ts").POST({})).status, 400);
  const answers = Object.fromEntries(PREFERENCE_QUESTIONS.map(q => [q.id, { self: q.options[0], acceptable: q.options, required: false }]));
  for (const id of ["a", "b"]) {
    actingId = id;
    assert.equal((await questionnaire.POST(req({ version: 2, answers }))).status, 200);
    assert.equal((await load("app/api/questionnaire/complete/route.ts").POST({})).status, 200);
    assert.equal((await priorities.POST(req({ version: 2, priorities: {} }))).status, 200);
    assert.equal((await prisma.user.findUnique({ where: { id } })).onboardingStep, "COMPLETE");
  }
  actingId = "a";
  assert.equal((await getPairCompatibility("a", "b")).score, 1);
  assert.equal((await (await discovery.GET({})).json()).candidates.length, 1);
  await prisma.match.create({ data: { user1Id: "a", user2Id: "b", score: 1 } });
  for (const [requesterId, targetId] of [["a", "b"], ["b", "a"]]) {
    await prisma.compatibilityCache.create({ data: { requesterId, targetId, score: 1, breakdown: "{}" } });
  }
  actingId = "b";
  assert.equal((await questionnaire.POST(req({ version: 2, answers: {
    v2_future_children: { self: "No", acceptable: ["Yes", "No"], required: false },
  } }))).status, 200);
  actingId = "a";
  assert.equal((await questionnaire.POST(req({ version: 2, answers: {
    v2_future_children: { self: "Yes", acceptable: ["Yes"], required: true },
  } }))).status, 200);
  assert.equal((await getPairCompatibility("a", "b")).eligibility, "INCOMPATIBLE");
  assert.equal(await prisma.compatibilityCache.count(), 0);
  assert.equal((await prisma.match.findFirst()).score, 0);
  assert.deepEqual((await (await discovery.GET({})).json()).candidates, []);
  assert.equal(await prisma.questionnaireAnswer.count({ where: { userId: "a", questionId: "q9" } }), 1);
  assert.equal((await (await questionnaire.GET({})).json()).answers.q9, undefined);
});
