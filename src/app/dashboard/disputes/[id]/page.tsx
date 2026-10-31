import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseWorkspace } from "@/components/dashboard/case-workspace";
import { analyzeRuleBased } from "@/lib/analysis/analyze";
import { DEMO_CASES, DEMO_NOW, getDemoCase } from "@/lib/demo/cases";

export function generateStaticParams() {
  return DEMO_CASES.map((c) => ({ id: c.dispute.id }));
}

export async function generateMetadata({ params }: PageProps<"/dashboard/disputes/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: id };
}

export default async function DisputePage({ params }: PageProps<"/dashboard/disputes/[id]">) {
  const { id } = await params;
  const caseFile = getDemoCase(id);
  if (!caseFile) notFound();

  const initial = analyzeRuleBased(caseFile, DEMO_NOW, "Preview computed without a model call. Run the AI analysis for the full dossier.");
  return <CaseWorkspace caseFile={caseFile} initial={initial} now={DEMO_NOW} />;
}
