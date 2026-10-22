import type { Prisma } from "@prisma/client";
import { QUESTIONS, QUESTIONNAIRE_VERSION, PREFERENCE_QUESTIONS } from "@/lib/questionnaire/questions";
import { answerMap } from "@/lib/questionnaire/answers";
import { SCORING_VERSION } from "@/lib/matching/algorithm";
import { CONSENT_VERSION } from "./contracts";

/** Called only inside a newly created match transaction. Never backfills later answers. */
export async function captureMatchBaselines(tx: Prisma.TransactionClient, match: { id: string; user1Id: string; user2Id: string }) {
  const consented = await tx.researchConsent.findMany({ where: {
    userId: { in: [match.user1Id, match.user2Id] }, enabled: true, policyVersion: CONSENT_VERSION,
  } });
  for (const consent of consented) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: consent.userId }, include: { answers: true, priorities: true, personalityAssessment: true } });
    const ids = new Set(QUESTIONS.map(q => q.id));
    const priorityIds = new Set(PREFERENCE_QUESTIONS.map(q => q.id));
    await tx.matchBaseline.upsert({ where: { userId_matchId: { userId: user.id, matchId: match.id } }, update: {},
      create: { userId: user.id, matchId: match.id, consentVersion: CONSENT_VERSION,
        questionnaireVersion: QUESTIONNAIRE_VERSION, scoringVersion: SCORING_VERSION,
        personalityJson: user.personalityAssessment ? JSON.stringify({ version: user.personalityAssessment.instrumentVersion,
          answers: JSON.parse(user.personalityAssessment.answersJson) }) : null,
        answersJson: JSON.stringify(answerMap(user.answers.filter(a => ids.has(a.questionId)))),
        prioritiesJson: JSON.stringify(Object.fromEntries(user.priorities.filter(p => priorityIds.has(p.questionId)).map(p => [p.questionId, p.importance]))),
      } });
  }
}

export async function eraseResearchData(tx: Prisma.TransactionClient, userId: string) {
  await tx.relationshipFeedback.deleteMany({ where: { userId } });
  await tx.matchBaseline.deleteMany({ where: { userId } });
}
