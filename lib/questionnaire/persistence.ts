import type { Prisma } from "@prisma/client";
import type { Question } from "@/types/questionnaire";

/** Catalog registration and answer writes share a transaction; no seed is required. */
export async function registerQuestion(tx: Prisma.TransactionClient, q: Question) {
  const data = { key: q.key, category: q.category, text: q.text, type: q.type,
    options: q.options ? JSON.stringify(q.options) : null,
    minLabel: q.minLabel ?? null, maxLabel: q.maxLabel ?? null, order: q.order, isActive: true };
  await tx.question.upsert({ where: { id: q.id }, update: data, create: { id: q.id, ...data } });
}
