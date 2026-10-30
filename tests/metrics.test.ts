import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeKpis, median } from "@/lib/metrics";
import type { ResolvedDispute } from "@/lib/demo/history";

const base = { network: "visa", reasonCode: "10.4", closedAt: "2026-10-01T00:00:00.000Z" } as const;

describe("computeKpis", () => {
  it("excludes accepted disputes from the win rate and submission time", () => {
    const history: ResolvedDispute[] = [
      { ...base, id: "a", outcome: "won", amountUsd: 100, minutesToSubmit: 20 },
      { ...base, id: "b", outcome: "won", amountUsd: 50, minutesToSubmit: 40 },
      { ...base, id: "c", outcome: "lost", amountUsd: 70, minutesToSubmit: 30 },
      { ...base, id: "d", outcome: "accepted", amountUsd: 999, minutesToSubmit: null },
    ];
    const kpis = computeKpis(history, { transactions: 1000, disputes: 4 }, 0.009);
    assert.equal(kpis.winRate, 2 / 3);
    assert.equal(kpis.decided, 3);
    assert.equal(kpis.medianMinutesToSubmit, 30);
    assert.equal(kpis.recoveredUsd, 150);
    assert.equal(kpis.disputeRate, 0.004);
  });

  it("handles empty input", () => {
    const kpis = computeKpis([], { transactions: 0, disputes: 0 }, 0.009);
    assert.equal(kpis.winRate, 0);
    assert.equal(kpis.disputeRate, 0);
    assert.equal(median([]), 0);
    assert.equal(median([1, 3, 2, 4]), 2.5);
  });
});
