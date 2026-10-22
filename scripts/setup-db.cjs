const path = require("node:path");
const { spawnSync } = require("node:child_process");
require("@next/env").loadEnvConfig(process.cwd());
const reset = process.argv.includes("--reset");
if (reset) {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("file:")) throw new Error("Reset is restricted to this project's local SQLite database.");
  const target = path.resolve("prisma", url.slice(5));
  const workspace = path.resolve(process.cwd());
  const relative = path.relative(workspace, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Database reset target must be inside the project workspace.");
}
for (const args of [[require.resolve("prisma/build/index.js"), "db", "push", ...(reset ? ["--force-reset"] : []), "--skip-generate"],
  [require.resolve("prisma/build/index.js"), "generate"], [path.resolve("prisma/seed.mjs")]]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
}
