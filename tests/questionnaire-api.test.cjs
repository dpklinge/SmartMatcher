const test = require("node:test");
const assert = require("node:assert/strict");
const createLoader = require("./load-typescript.cjs");

function fixture() {
  const writes = [], rows = [];
  const tx = {
    question: { upsert: async input => writes.push(["question", input]) },
    questionnaireAnswer: { upsert: async input => { writes.push(["answer", input]); rows.push(input.create); } },
    compatibilityCache: { deleteMany: async input => writes.push(["invalidate", input]) },
    user: { updateMany: async input => writes.push(["advance", input]) },
  };
  const prisma = { ...tx, questionnaireAnswer: { findMany: async () => rows }, $transaction: async fn => fn(tx) };
  const load = createLoader({
    "@/lib/mobile-auth": { getSession: async () => ({ user: { id: "person" } }) },
    "@/lib/prisma": { prisma },
    "@/lib/matching/recompute-matches": { recomputeMatchScores: async () => writes.push(["recompute"]) },
  });
  return { writes, rows, load, route: load("app/api/questionnaire/route.ts") };
}
const req = body => ({ json: async () => body });

test("answer API rejects stale version, malformed JSON, and invalid values without writes", async () => {
  const f = fixture();
  for (const request of [req({ answers: {} }), req({ version: 2, answers: { v2_future_children: "Yes" } }),
    { json: async () => { throw new Error("Bad JSON"); } }]) {
    const response = await f.route.POST(request);
    assert.ok([400, 409].includes(response.status));
  }
  assert.deepEqual(f.writes, []);
});

test("valid save registers its current question and invalidates both cache directions", async () => {
  const f = fixture();
  const value = { self: "Yes", acceptable: ["Yes"], required: true };
  assert.equal((await f.route.POST(req({ version: 2, answers: { v2_future_children: value } }))).status, 200);
  assert.equal(f.writes[0][0], "question");
  assert.equal(f.writes[1][1].create.value, JSON.stringify(value));
  assert.deepEqual(f.writes.find(([type]) => type === "invalidate")[1].where.OR,
    [{ requesterId: "person" }, { targetId: "person" }]);
  assert.ok(!f.writes.some(([type]) => type === "advance"));
  const data = await (await f.route.GET({})).json();
  assert.deepEqual(data.answers.v2_future_children, value);
  assert.equal(data.version, 2);
});

test("all completion endpoints reject missing required answers", async () => {
  const f = fixture();
  for (const name of ["questionnaire", "priorities"]) {
    const completion = f.load(`app/api/${name}/complete/route.ts`);
    assert.equal((await completion.POST({})).status, 400);
  }
  assert.ok(!f.writes.some(([type]) => type === "advance"));
});
