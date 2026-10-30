import type { Metadata } from "next";
import { DisputeQueue } from "@/components/dashboard/dispute-queue";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { analyzeRuleBased } from "@/lib/analysis/analyze";
import { DEMO_CASES, DEMO_NOW } from "@/lib/demo/cases";
import { DISPUTE_RATE_THRESHOLD, MONTHLY_VOLUME, RESOLVED_DISPUTES } from "@/lib/demo/history";
import { formatDate } from "@/lib/format";
import { computeKpis } from "@/lib/metrics";

export const metadata: Metadata = { title: "Disputes" };

export default function DashboardPage() {
  const kpis = computeKpis(RESOLVED_DISPUTES, MONTHLY_VOLUME, DISPUTE_RATE_THRESHOLD);
  const rows = DEMO_CASES.map((caseFile) => ({
    caseFile,
    verdict: analyzeRuleBased(caseFile, DEMO_NOW, null).dossier.verdict,
  })).sort((a, b) => a.caseFile.dispute.evidenceDueBy.localeCompare(b.caseFile.dispute.evidenceDueBy));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Disputes</h1>
        <p className="text-sm text-muted-foreground">As of {formatDate(DEMO_NOW)} · demo dataset</p>
      </div>
      <KpiRow kpis={kpis} month={MONTHLY_VOLUME.month} />
      <DisputeQueue rows={rows} now={DEMO_NOW} />
    </div>
  );
}
