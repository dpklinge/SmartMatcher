import { prisma } from "@/lib/prisma";
import { answerMap } from "@/lib/questionnaire/answers";
import { computeCompatibility } from "./algorithm";

export async function getPairCompatibility(requesterId: string, targetId: string) {
  const users = await prisma.user.findMany({
    where: { id: { in: [requesterId, targetId] } }, include: { answers: true, priorities: true },
  });
  const a = users.find(u => u.id === requesterId), b = users.find(u => u.id === targetId);
  if (!a || !b) return null;
  return computeCompatibility(answerMap(a.answers), Object.fromEntries(a.priorities.map(p => [p.questionId, p.importance])),
    answerMap(b.answers), Object.fromEntries(b.priorities.map(p => [p.questionId, p.importance])));
}
