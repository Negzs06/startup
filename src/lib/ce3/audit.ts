// Visa Compelling Evidence 3.0 audit — deterministic, no I/O.
//
// SIMPLIFIED READING. This encodes our working interpretation of CE 3.0 for
// Visa reason code 10.4 and must be verified against the current Visa Core
// Rules / Dispute Management Guidelines before evidence is filed for real:
//
//   * The dispute must be Visa 10.4 (card-absent fraud).
//   * At least two prior transactions on the same payment credential must be
//     undisputed (never reported as fraud) and between 120 and 365 days old,
//     measured from the disputed transaction's date (both bounds inclusive).
//   * Each of those prior transactions must share at least two data elements
//     with the disputed transaction, and at least one of the shared elements
//     must be the IP address or the device ID. The elements compared are
//     IP address, device ID, customer account / login ID and shipping address.
//
// Anything outside that reading (e.g. issuer-specific exemptions, the
// exact normalisation rules for addresses) is intentionally out of scope.

import type { CaseFile, Transaction, TransactionFingerprint } from "@/lib/domain/types";
import { REASON_CODES } from "@/lib/domain/reason-codes";

export const CE3_MIN_AGE_DAYS = 120;
export const CE3_MAX_AGE_DAYS = 365;
export const CE3_REQUIRED_TRANSACTIONS = 2;

export type Ce3Element = keyof TransactionFingerprint;
const ELEMENTS: Ce3Element[] = ["ip", "deviceId", "accountId", "shippingAddress"];
const ANCHOR_ELEMENTS: Ce3Element[] = ["ip", "deviceId"];

export type Ce3CandidateResult =
  | { transactionId: string; ageDays: number; qualifies: true; matchedElements: Ce3Element[] }
  | {
      transactionId: string;
      ageDays: number;
      qualifies: false;
      matchedElements: Ce3Element[];
      reason: "disputed" | "too_recent" | "too_old" | "insufficient_matches" | "no_ip_or_device_match";
    };

export type Ce3Audit =
  | { applicable: false; reason: string }
  | {
      applicable: true;
      eligible: boolean;
      qualifyingCount: number;
      required: number;
      candidates: Ce3CandidateResult[];
      summary: string;
    };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between two instants (floor), positive when `earlier` is before `later`. */
export function daysBetween(earlier: string, later: string): number {
  return Math.floor((Date.parse(later) - Date.parse(earlier)) / DAY_MS);
}

function normalize(element: Ce3Element, value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (element === "shippingAddress") {
    return trimmed.toLowerCase().replace(/[.,#]/g, " ").replace(/\s+/g, " ").trim();
  }
  if (element === "accountId") return trimmed.toLowerCase();
  return trimmed;
}

export function matchElements(
  disputed: TransactionFingerprint,
  prior: TransactionFingerprint,
): Ce3Element[] {
  return ELEMENTS.filter((element) => {
    const a = normalize(element, disputed[element]);
    const b = normalize(element, prior[element]);
    return a !== null && a === b;
  });
}

export function evaluateCandidate(disputed: Transaction, prior: Transaction): Ce3CandidateResult {
  const ageDays = daysBetween(prior.createdAt, disputed.createdAt);
  const matchedElements = matchElements(disputed, prior);
  const base = { transactionId: prior.id, ageDays, matchedElements };

  if (prior.disputed) return { ...base, qualifies: false, reason: "disputed" };
  if (ageDays < CE3_MIN_AGE_DAYS) return { ...base, qualifies: false, reason: "too_recent" };
  if (ageDays > CE3_MAX_AGE_DAYS) return { ...base, qualifies: false, reason: "too_old" };
  if (matchedElements.length < 2) return { ...base, qualifies: false, reason: "insufficient_matches" };
  if (!matchedElements.some((e) => ANCHOR_ELEMENTS.includes(e))) {
    return { ...base, qualifies: false, reason: "no_ip_or_device_match" };
  }
  return { ...base, qualifies: true };
}

export function auditCe3(caseFile: Pick<CaseFile, "dispute" | "charge" | "priorTransactions">): Ce3Audit {
  const { dispute, charge, priorTransactions } = caseFile;
  if (!REASON_CODES[dispute.reasonCode].ce3Applicable) {
    return {
      applicable: false,
      reason: `CE 3.0 covers Visa 10.4 only; this dispute is ${dispute.network === "visa" ? "Visa" : "Mastercard"} ${dispute.reasonCode}.`,
    };
  }

  const candidates = priorTransactions
    .filter((t) => Date.parse(t.createdAt) < Date.parse(charge.createdAt))
    .map((t) => evaluateCandidate(charge, t))
    .sort((a, b) => a.ageDays - b.ageDays);
  const qualifyingCount = candidates.filter((c) => c.qualifies).length;
  const eligible = qualifyingCount >= CE3_REQUIRED_TRANSACTIONS;

  return {
    applicable: true,
    eligible,
    qualifyingCount,
    required: CE3_REQUIRED_TRANSACTIONS,
    candidates,
    summary: eligible
      ? `${qualifyingCount} prior undisputed transactions qualify; CE 3.0 can be invoked.`
      : `Only ${qualifyingCount} of ${CE3_REQUIRED_TRANSACTIONS} required qualifying transactions found; CE 3.0 cannot be invoked.`,
  };
}

export const CE3_REASON_LABELS: Record<Exclude<Ce3CandidateResult, { qualifies: true }>["reason"], string> = {
  disputed: "Previously disputed",
  too_recent: `Younger than ${CE3_MIN_AGE_DAYS} days`,
  too_old: `Older than ${CE3_MAX_AGE_DAYS} days`,
  insufficient_matches: "Fewer than 2 matching elements",
  no_ip_or_device_match: "No IP or device match",
};

export const CE3_ELEMENT_LABELS: Record<Ce3Element, string> = {
  ip: "IP address",
  deviceId: "Device ID",
  accountId: "Account ID",
  shippingAddress: "Shipping address",
};
