// Core domain model. Everything the analysis sees is a CaseFile: the dispute
// itself plus the records pulled from connected systems (payments, identity,
// product analytics, helpdesk, Terms of Service).

export type Network = "visa" | "mastercard";
export type ReasonCode = "10.4" | "13.1" | "4837" | "4853";
export type Processor = "stripe" | "adyen" | "braintree";

/** BCP 47 tags for the issuer languages the product supports today. */
export type IssuerLanguage = "de" | "pt-BR" | "ja" | "fr" | "en";

export type DisputeStatus =
  | "needs_review"
  | "ready_to_submit"
  | "submitted"
  | "won"
  | "lost"
  | "accepted";

export interface Issuer {
  name: string;
  country: string; // ISO 3166-1 alpha-2
  language: IssuerLanguage;
}

export interface Dispute {
  id: string;
  processor: Processor;
  processorDisputeId: string;
  network: Network;
  reasonCode: ReasonCode;
  /** Amount in minor units (cents). */
  amount: number;
  currency: string; // ISO 4217, lowercase like Stripe
  openedAt: string; // ISO 8601
  evidenceDueBy: string; // ISO 8601
  status: DisputeStatus;
  issuer: Issuer;
  cardholderClaim: string;
}

export interface Merchant {
  name: string;
  product: string;
  refundWindowDays: number;
  supportEmail: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  accountId: string;
  accountCreatedAt: string;
  country: string;
}

/** Elements Visa CE 3.0 compares between the disputed and prior transactions. */
export interface TransactionFingerprint {
  ip?: string;
  deviceId?: string;
  accountId?: string;
  shippingAddress?: string;
}

export interface Transaction extends TransactionFingerprint {
  id: string;
  createdAt: string;
  amount: number;
  currency: string;
  description: string;
  /** True if this transaction was itself reported as fraud / disputed. */
  disputed: boolean;
}

export type EvidenceSource = "stripe" | "auth0" | "posthog" | "zendesk" | "tos";

export interface SessionEvent {
  id: string;
  at: string;
  source: "auth0" | "posthog";
  kind: "login" | "feature_use" | "export" | "settings_change" | "logout";
  ip: string;
  deviceId: string;
  detail: string;
}

export interface TicketMessage {
  at: string;
  author: "customer" | "agent";
  body: string;
}

export interface SupportTicket {
  id: string;
  createdAt: string;
  subject: string;
  status: "open" | "pending" | "solved";
  messages: TicketMessage[];
}

export interface TosClause {
  id: string;
  title: string;
  text: string;
}

export interface TermsOfService {
  version: string;
  url: string;
  acceptedAt: string;
  acceptedIp: string;
  clauses: TosClause[];
}

export interface CaseFile {
  dispute: Dispute;
  merchant: Merchant;
  customer: Customer;
  charge: Transaction;
  priorTransactions: Transaction[];
  sessions: SessionEvent[];
  tickets: SupportTicket[];
  tos: TermsOfService;
}
