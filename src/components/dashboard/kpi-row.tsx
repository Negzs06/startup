import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/format";
import type { PORTFOLIO } from "@/lib/disputes";

export function KpiRow({ portfolio }: { portfolio: typeof PORTFOLIO }) {
  const rate = portfolio.monthlyDisputes / portfolio.monthlyTransactions;
  const usedOfThreshold = Math.round((rate / portfolio.vdmpThreshold) * 100);
  const fee = Math.round(portfolio.recoveredCents * portfolio.feeRate);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi title="Win rate" value={`${Math.round(portfolio.winRate * 100)}%`} hint={`Industry ${Math.round(portfolio.industryWinRate * 100)}%`} />
      <Kpi title="Median time to submit" value={`${portfolio.medianMinutesToSubmit} min`} hint="Target under 60 min" />
      <Kpi title="Recovered (90 days)" value={formatMoney(portfolio.recoveredCents)} hint={`Fee at ${Math.round(portfolio.feeRate * 100)}%: ${formatMoney(fee)}`} />
      <Card>
        <CardHeader>
          <CardDescription>Dispute rate</CardDescription>
          <CardTitle className="text-2xl">{(rate * 100).toFixed(2)}%</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={usedOfThreshold} aria-label="Share of the 0.9% monitoring threshold used" />
          <p className="text-xs text-muted-foreground">{usedOfThreshold}% of the 0.9% VDMP/ECP threshold</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
