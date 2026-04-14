import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import { PrioritySetup } from "@/components/onboarding/PrioritySetup";
import { redirect } from "next/navigation";

export default async function PrioritiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const dbPriorities = await prisma.answerPriority.findMany({
    where: { userId: session.user.id },
  });

  const priorityMap = Object.fromEntries(dbPriorities.map((p) => [p.questionId, p.importance])) as Record<
    string,
    "NOT_IMPORTANT" | "SOMEWHAT_IMPORTANT" | "IMPORTANT"
  >;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1/3 h-1.5 bg-rose-500 rounded-full" />
            <div className="w-1/3 h-1.5 bg-rose-500 rounded-full" />
            <div className="w-1/3 h-1.5 bg-rose-500 rounded-full" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Step 3 of 3 — Final step!</p>
          <h1 className="text-2xl font-black text-gray-900 mt-4">Set Your Priorities</h1>
          <p className="text-gray-500 text-sm leading-relaxed mt-1">
            Tell us how important each question is to you. This shapes who we show you first.
          </p>
        </div>

        <PrioritySetup questions={QUESTIONS} initialPriorities={priorityMap} />
      </div>
    </div>
  );
}
