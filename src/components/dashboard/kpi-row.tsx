import { Card, CardContent } from "@/components/ui/card";
import { formatPercent, formatUsd } from "@/lib/format";
import type { Kpis } from "@/lib/metrics";
import { cn } from "@/lib/utils";

function Tile({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
        <div className="mt-2 text-xs text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}

export function KpiRow({ kpis, month }: { kpis: Kpis; month: string }) {
  const ratio = kpis.disputeRate / kpis.threshold;
  const severity = ratio >= 1 ? "critical" : ratio >= 0.75 ? "warning" : "ok";
  // Meter scale runs to 1.5× the threshold so headroom is visible on both sides.
  const scaleMax = kpis.threshold * 1.5;
  const fill = Math.min(kpis.disputeRate / scaleMax, 1);
  const marker = kpis.threshold / scaleMax;

  return (
    <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Tile label="Win rate" value={formatPercent(kpis.winRate)}>
        {kpis.decided} decided disputes · target &gt;70% · industry 40–45%
      </Tile>
      <Tile label="Median time to submit" value={`${Math.round(kpis.medianMinutesToSubmit)} min`}>
        From webhook to filed evidence · target &lt;60 min
      </Tile>
      <Tile label="Recovered" value={formatUsd(kpis.recoveredUsd)}>
        Won disputes since July 2026 (USD)
      </Tile>
      <Tile label={`Dispute rate · ${month}`} value={formatPercent(kpis.disputeRate, 2)}>
        <div
          role="meter"
          aria-label="Dispute rate against the 0.9% monitoring threshold"
          aria-valuemin={0}
          aria-valuemax={scaleMax * 100}
          aria-valuenow={Number((kpis.disputeRate * 100).toFixed(2))}
          className="relative mt-1 mb-2 h-2 rounded-full bg-success/15"
        >
          <div
            className={cn(
              "h-full rounded-full",
              severity === "ok" && "bg-success",
              severity === "warning" && "bg-warning",
              severity === "critical" && "bg-destructive",
            )}
            style={{ width: `${fill * 100}%` }}
          />
          <div aria-hidden className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/70" style={{ left: `${marker * 100}%` }} />
        </div>
        {severity === "ok"
          ? `${formatPercent(1 - ratio)} headroom below the ${formatPercent(kpis.threshold, 1)} threshold`
          : `Within ${formatPercent(Math.max(1 - ratio, 0))} of the ${formatPercent(kpis.threshold, 1)} threshold`}
      </Tile>
    </section>
  );
}
