import type { ResolvedDispute } from "@/lib/demo/history";

export interface Kpis {
  /** Won / (won + lost). Accepted disputes are excluded: nothing was contested. */
  winRate: number;
  decided: number;
  medianMinutesToSubmit: number;
  recoveredUsd: number;
  disputeRate: number;
  threshold: number;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function computeKpis(
  history: ResolvedDispute[],
  volume: { transactions: number; disputes: number },
  threshold: number,
): Kpis {
  const won = history.filter((d) => d.outcome === "won");
  const lost = history.filter((d) => d.outcome === "lost");
  const decided = won.length + lost.length;
  return {
    winRate: decided ? won.length / decided : 0,
    decided,
    medianMinutesToSubmit: median(history.flatMap((d) => (d.minutesToSubmit === null ? [] : [d.minutesToSubmit]))),
    recoveredUsd: won.reduce((sum, d) => sum + d.amountUsd, 0),
    disputeRate: volume.transactions ? volume.disputes / volume.transactions : 0,
    threshold,
  };
}
