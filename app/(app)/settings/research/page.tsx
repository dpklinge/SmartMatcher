import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ResearchDashboard } from "@/components/research/ResearchDashboard";
export default async function ResearchPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <main className="max-w-2xl mx-auto p-5 pb-24"><ResearchDashboard /></main>;
}
