import type {
  Ce3Match,
  Ce3Rejection,
  Ce3Result,
  DataElement,
  Dispute,
  Transaction,
} from "./types";

/**
 * Simplified Visa Compelling Evidence 3.0 audit for reason code 10.4
 * (Other Fraud - Card-Absent Environment).
 *
 * A prior transaction qualifies when it is undisputed, 120-365 days older than
 * the disputed one, and shares at least two data elements with it - one of
 * which must be the IP address or the device ID. Two qualifying transactions
 * are required. Always confirm against the current Visa rules before relying
 * on this for filing.
 */
export const CE3_MIN_AGE_DAYS = 120;
export const CE3_MAX_AGE_DAYS = 365;
export const CE3_REQUIRED_TRANSACTIONS = 2;

const DAY_MS = 86_400_000;

export function ageInDays(prior: string, disputed: string): number {
  return Math.floor((Date.parse(disputed) - Date.parse(prior)) / DAY_MS);
}

export function matchingElements(a: Transaction, b: Transaction): DataElement[] {
  const matched: DataElement[] = [];
  if (a.ip === b.ip) matched.push("ip");
  if (a.deviceId === b.deviceId) matched.push("deviceId");
  if (a.accountId === b.accountId) matched.push("accountId");
  if (a.shippingAddress && a.shippingAddress === b.shippingAddress) {
    matched.push("shippingAddress");
  }
  return matched;
}

export function auditCe3(dispute: Dispute): Ce3Result {
  const applicable = dispute.network === "visa" && dispute.reasonCode === "10.4";
  if (!applicable) {
    return {
      applicable: false,
      eligible: false,
      required: CE3_REQUIRED_TRANSACTIONS,
      qualifying: [],
      rejected: [],
      summary: `CE 3.0 only applies to Visa 10.4; reason code ${dispute.reasonCode} is argued on usage and contract evidence instead.`,
    };
  }

  const qualifying: Ce3Match[] = [];
  const rejected: Ce3Rejection[] = [];

  for (const prior of dispute.history) {
    const age = ageInDays(prior.date, dispute.transaction.date);
    const reject = (reason: string) => rejected.push({ transaction: prior, ageDays: age, reason });

    if (prior.id === dispute.transaction.id) continue;
    if (prior.disputed) {
      reject("Prior transaction was disputed or refunded");
    } else if (age < CE3_MIN_AGE_DAYS) {
      reject(`Only ${age} days old (minimum ${CE3_MIN_AGE_DAYS})`);
    } else if (age > CE3_MAX_AGE_DAYS) {
      reject(`${age} days old (maximum ${CE3_MAX_AGE_DAYS})`);
    } else {
      const matched = matchingElements(prior, dispute.transaction);
      const hasAnchor = matched.includes("ip") || matched.includes("deviceId");
      if (matched.length < 2 || !hasAnchor) {
        reject(
          matched.length === 0
            ? "No matching data elements"
            : `Matches only ${matched.join(", ")}; needs IP or device ID plus one more element`,
        );
      } else {
        qualifying.push({ transaction: prior, ageDays: age, matched });
      }
    }
  }

  const eligible = qualifying.length >= CE3_REQUIRED_TRANSACTIONS;
  return {
    applicable,
    eligible,
    required: CE3_REQUIRED_TRANSACTIONS,
    qualifying,
    rejected,
    summary: eligible
      ? `${qualifying.length} qualifying prior transactions found - the issuer's liability shift for fraud claims applies.`
      : `${qualifying.length} of ${CE3_REQUIRED_TRANSACTIONS} required qualifying transactions found - CE 3.0 cannot be invoked.`,
  };
}
