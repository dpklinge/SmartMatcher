import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PersonalityAssessment } from "@/components/onboarding/PersonalityAssessment";
export default async function PersonalityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <main className="max-w-2xl mx-auto p-5 pb-24"><PersonalityAssessment /></main>;
}
