import { prisma } from "@/lib/prisma";
import { computeCompatibility } from "./algorithm";

/**
 * Recomputes compatibility scores for all existing matches involving userId,
 * using their current answers and priorities. Updates both Match.score and
 * the compatibility cache.
 */
export async function recomputeMatchScores(userId: string): Promise<void> {
  const [myAnswers, myPriorities, matches] = await Promise.all([
    prisma.questionnaireAnswer.findMany({ where: { userId } }),
    prisma.answerPriority.findMany({ where: { userId } }),
    prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    }),
  ]);

  if (matches.length === 0) return;

  const myAnswerMap = Object.fromEntries(
    myAnswers.map((a) => [a.questionId, JSON.parse(a.value)])
  );
  const myPriorityMap = Object.fromEntries(
    myPriorities.map((p) => [p.questionId, p.importance])
  );

  await Promise.all(
    matches.map(async (match) => {
      const partnerId = match.user1Id === userId ? match.user2Id : match.user1Id;
      const partnerAnswers = await prisma.questionnaireAnswer.findMany({
        where: { userId: partnerId },
      });
      const partnerAnswerMap = Object.fromEntries(
        partnerAnswers.map((a) => [a.questionId, JSON.parse(a.value)])
      );

      const result = computeCompatibility(myAnswerMap, myPriorityMap, partnerAnswerMap);

      await Promise.all([
        prisma.match.update({
          where: { id: match.id },
          data: { score: result.score },
        }),
        prisma.compatibilityCache.upsert({
          where: { requesterId_targetId: { requesterId: userId, targetId: partnerId } },
          update: {
            score: result.score,
            breakdown: JSON.stringify(result.categoryBreakdown),
            computedAt: new Date(),
          },
          create: {
            requesterId: userId,
            targetId: partnerId,
            score: result.score,
            breakdown: JSON.stringify(result.categoryBreakdown),
          },
        }),
      ]);
    })
  );
}
