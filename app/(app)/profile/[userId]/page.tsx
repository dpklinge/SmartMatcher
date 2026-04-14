import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeCompatibility } from "@/lib/matching/algorithm";
import { CompatibilityBreakdown } from "@/components/profile/CompatibilityBreakdown";

interface Props {
  params: { userId: string };
}

export default async function UserProfilePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { userId: targetId } = params;
  const requesterId = session.user.id;

  const [targetUser, requesterAnswers, requesterPriorities, targetAnswers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetId },
      include: { profile: { include: { photos: { orderBy: { order: "asc" } } } } },
    }),
    prisma.questionnaireAnswer.findMany({ where: { userId: requesterId } }),
    prisma.answerPriority.findMany({ where: { userId: requesterId } }),
    prisma.questionnaireAnswer.findMany({ where: { userId: targetId } }),
  ]);

  if (!targetUser) notFound();

  const answerMap = Object.fromEntries(requesterAnswers.map((a) => [a.questionId, a.value]));
  const priorityMap = Object.fromEntries(requesterPriorities.map((p) => [p.questionId, p.importance]));
  const targetAnswerMap = Object.fromEntries(targetAnswers.map((a) => [a.questionId, a.value]));

  const compatibility = computeCompatibility(answerMap, priorityMap, targetAnswerMap);

  const profile = targetUser.profile;
  const age = profile?.birthDate
    ? new Date().getFullYear() - new Date(profile.birthDate).getFullYear()
    : null;

  const photos = profile?.photos?.map((p) => p.url) ?? (targetUser.image ? [targetUser.image] : []);

  return (
    <div className="min-h-screen bg-white">
      {/* Photo header */}
      <div className="relative h-80 bg-gray-100">
        {photos[0] ? (
          <img src={photos[0]} alt={targetUser.name ?? "Profile"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">👤</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-white text-2xl font-black">
            {targetUser.name}{age ? `, ${age}` : ""}
          </h1>
          {profile?.location && (
            <p className="text-white/80 text-sm">📍 {profile.location}</p>
          )}
        </div>
      </div>

      {/* Photo strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {photos.slice(1).map((url, i) => (
            <img key={i} src={url} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
          ))}
        </div>
      )}

      <div className="px-4 py-5 space-y-6">
        {/* Bio */}
        {profile?.bio && (
          <div>
            <h3 className="font-bold text-gray-700 mb-1.5">About</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Occupation", value: profile?.occupation },
            { label: "Education", value: profile?.education },
          ].filter((i) => i.value).map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 font-medium">{item.label}</p>
              <p className="font-semibold text-gray-800 text-sm">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Compatibility */}
        <div>
          <h3 className="font-bold text-gray-700 mb-3">Compatibility</h3>
          <CompatibilityBreakdown
            percentage={compatibility.percentage}
            breakdown={compatibility.categoryBreakdown as Record<string, number>}
            alignedPriorities={compatibility.alignedPriorities}
          />
        </div>
      </div>
    </div>
  );
}
