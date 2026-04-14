import { PrismaClient } from "@prisma/client";
import { QUESTIONS } from "../lib/questionnaire/questions";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding questions…");
  for (const q of QUESTIONS) {
    await prisma.question.upsert({
      where: { key: q.key },
      update: {
        category: q.category,
        text: q.text,
        type: q.type,
        options: q.options ? JSON.stringify(q.options) : null,
        minLabel: q.minLabel ?? null,
        maxLabel: q.maxLabel ?? null,
        order: q.order,
      },
      create: {
        id: q.id,
        key: q.key,
        category: q.category,
        text: q.text,
        type: q.type,
        options: q.options ? JSON.stringify(q.options) : null,
        minLabel: q.minLabel ?? null,
        maxLabel: q.maxLabel ?? null,
        order: q.order,
      },
    });
  }
  console.log(`Seeded ${QUESTIONS.length} questions.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
