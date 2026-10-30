export type Gateway = "stripe" | "adyen" | "braintree";
export type Network = "visa" | "mastercard";

export type DisputeStatus =
  | "new"
  | "ready"
  | "submitted"
  | "won"
  | "lost"
  | "accepted";

export type DataElement = "ip" | "deviceId" | "accountId" | "shippingAddress";

export interface Transaction {
  id: string;
  /** ISO-8601 timestamp. */
  date: string;
  amountCents: number;
  currency: string;
  ip: string;
  deviceId: string;
  accountId: string;
  shippingAddress?: string;
  /** True when this charge was itself disputed or refunded. */
  disputed: boolean;
}

export type EvidenceSource = "auth0" | "posthog" | "zendesk" | "stripe" | "tos";

export interface LogEntry {
  at: string;
  source: EvidenceSource;
  text: string;
}

export interface TosClause {
  id: string;
  title: string;
  text: string;
}

export interface Dispute {
  id: string;
  gateway: Gateway;
  network: Network;
  reasonCode: string;
  reasonLabel: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  /** ISO date by which the representment must be filed. */
  dueBy: string;
  status: DisputeStatus;
  customer: { name: string; email: string; country: string };
  issuer: { bank: string; country: string; language: string; languageName: string };
  transaction: Transaction;
  /** Prior transactions on the same card, any age. */
  history: Transaction[];
  /** Normalized log lines from Auth0, PostHog, Zendesk and the gateway. */
  evidence: LogEntry[];
  tos: TosClause[];
}

export interface Ce3Match {
  transaction: Transaction;
  ageDays: number;
  matched: DataElement[];
}

export interface Ce3Rejection {
  transaction: Transaction;
  ageDays: number;
  reason: string;
}

export interface Ce3Result {
  /** False for reason codes CE 3.0 does not apply to. */
  applicable: boolean;
  eligible: boolean;
  required: number;
  qualifying: Ce3Match[];
  rejected: Ce3Rejection[];
  summary: string;
}

export interface Dossier {
  verdict: "contest" | "accept";
  /** 0-1 estimate that the representment succeeds. */
  confidence: number;
  rationale: string;
  timeline: { at: string; source: EvidenceSource; event: string }[];
  clauses: { id: string; quote: string; relevance: string }[];
  coverLetter: { language: string; english: string; localized: string };
  risks: string[];
}

export interface AnalysisResult {
  source: "claude" | "fixture";
  model: string | null;
  ce3: Ce3Result;
  dossier: Dossier;
  /** Set when the result is not a live Claude analysis, with the reason. */
  note?: string;
}
