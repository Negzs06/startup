// Resolved disputes and monthly volume behind the dashboard KPIs (demo data).

import type { Network, ReasonCode } from "@/lib/domain/types";

export interface ResolvedDispute {
  id: string;
  network: Network;
  reasonCode: ReasonCode;
  outcome: "won" | "lost" | "accepted";
  amountUsd: number;
  minutesToSubmit: number | null; // null for accepted disputes (nothing submitted)
  closedAt: string;
}

type Row = [ReasonCode, ResolvedDispute["outcome"], number, number | null, string];

const ROWS: Row[] = [
  ["10.4", "won", 149, 31, "2026-07-03"],
  ["13.1", "won", 588, 44, "2026-07-06"],
  ["4837", "won", 89, 27, "2026-07-09"],
  ["10.4", "lost", 49, 38, "2026-07-12"],
  ["4853", "accepted", 348, null, "2026-07-15"],
  ["10.4", "won", 1188, 52, "2026-07-21"],
  ["13.1", "won", 299, 29, "2026-07-28"],
  ["4853", "won", 1788, 57, "2026-08-02"],
  ["10.4", "won", 149, 24, "2026-08-08"],
  ["4837", "lost", 199, 41, "2026-08-11"],
  ["13.1", "won", 99, 22, "2026-08-17"],
  ["10.4", "won", 588, 35, "2026-08-23"],
  ["4853", "lost", 348, 49, "2026-08-29"],
  ["10.4", "won", 49, 19, "2026-09-02"],
  ["4837", "won", 264, 33, "2026-09-08"],
  ["13.1", "accepted", 99, null, "2026-09-12"],
  ["10.4", "won", 149, 26, "2026-09-17"],
  ["4853", "won", 588, 46, "2026-09-24"],
  ["10.4", "lost", 99, 30, "2026-09-30"],
  ["13.1", "won", 1188, 39, "2026-10-04"],
  ["4837", "won", 149, 28, "2026-10-09"],
  ["10.4", "won", 299, 21, "2026-10-14"],
];

export const RESOLVED_DISPUTES: ResolvedDispute[] = ROWS.map(([reasonCode, outcome, amountUsd, minutesToSubmit, closedAt], i) => ({
  id: `CG-${(980 + i).toString()}`,
  network: reasonCode === "4837" || reasonCode === "4853" ? "mastercard" : "visa",
  reasonCode,
  outcome,
  amountUsd,
  minutesToSubmit,
  closedAt: `${closedAt}T12:00:00.000Z`,
}));

/** Card transactions and disputes in the current monitoring month. */
export const MONTHLY_VOLUME = { month: "October 2026", transactions: 41_870, disputes: 156 };

/** Visa / Mastercard monitoring threshold used in the dashboard (VDMP / ECP style). */
export const DISPUTE_RATE_THRESHOLD = 0.009;
