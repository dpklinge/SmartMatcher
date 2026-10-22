const fs = require("node:fs");
const path = require("node:path");
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");
const load = require("./lib/load-project-module.cjs")();
const { prepareResearchDataset } = load("lib/research/dataset.ts");
const { CONSENT_VERSION } = load("lib/research/contracts.ts");

async function main() {
  loadEnvConfig(process.cwd());
  const index = process.argv.indexOf("--output");
  if (index < 0 || !process.argv[index + 1]) throw new Error("Usage: node scripts/export-research.cjs --output <new-file.json>");
  const secret = process.env.RESEARCH_EXPORT_SECRET ?? "";
  if (secret.length < 32) throw new Error("Set RESEARCH_EXPORT_SECRET to at least 32 characters. Keep it private and stable for repeat exports.");
  const prisma = new PrismaClient();
  try {
    const data = await prisma.$transaction(async tx => {
      const consents = await tx.researchConsent.findMany({ where: { enabled: true, policyVersion: CONSENT_VERSION } });
      const matches = await tx.match.findMany({ include: { baselines: true, feedback: true } });
      return prepareResearchDataset(matches, new Set(consents.map(c => c.userId)), secret);
    });
    // A new destination is required to avoid accidentally replacing an earlier private export.
    fs.writeFileSync(path.resolve(process.argv[index + 1]), JSON.stringify(data, null, 2), { flag: "wx", mode: 0o600 });
    process.stdout.write(`Exported ${data.includedPairs} eligible pairs. No model was trained.\n`);
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
