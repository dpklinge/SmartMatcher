import { prisma } from "@/lib/prisma";
import { getPairCompatibility } from "./service";

export async function recomputeMatchScores(userId: string): Promise<void> {
  const matches = await prisma.match.findMany({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } });
  for (const match of matches) {
    const result = await getPairCompatibility(match.user1Id, match.user2Id);
    await prisma.match.update({ where: { id: match.id }, data: {
      score: result?.eligibility === "ELIGIBLE" ? result.score : 0,
    } });
  }
}
