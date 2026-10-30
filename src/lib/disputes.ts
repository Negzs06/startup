import type { Dispute, Transaction } from "./types";

/**
 * Demo disputes for a fictional merchant ("Lumen Analytics"). In production
 * these come from the gateway webhooks plus the Auth0 / PostHog / Zendesk /
 * Stripe connectors; the shape mirrors what those connectors normalize to.
 */

const tx = (
  id: string,
  date: string,
  amountCents: number,
  ip: string,
  deviceId: string,
  accountId: string,
  overrides: Partial<Transaction> = {},
): Transaction => ({
  id,
  date,
  amountCents,
  currency: "USD",
  ip,
  deviceId,
  accountId,
  disputed: false,
  ...overrides,
});

const STANDARD_TOS = [
  {
    id: "tos-4.2",
    title: "4.2 Subscription and renewal",
    text: "Annual plans renew automatically at the end of each term. Customers are notified by email 14 days before renewal and may cancel at any time before the renewal date.",
  },
  {
    id: "tos-7.1",
    title: "7.1 Refunds",
    text: "Customers may request a full refund within 14 days of the initial purchase or of a renewal charge. After 14 days, fees are non-refundable.",
  },
  {
    id: "tos-9.3",
    title: "9.3 Account responsibility",
    text: "Customers are responsible for all activity under their account credentials, including activity by users they authorize.",
  },
];

export const DISPUTES: Dispute[] = [
  {
    id: "dp_1QvK9aLm",
    gateway: "stripe",
    network: "visa",
    reasonCode: "10.4",
    reasonLabel: "Other fraud - card-absent environment",
    amountCents: 238_800,
    currency: "USD",
    createdAt: "2026-10-28T09:14:00Z",
    dueBy: "2026-11-11",
    status: "new",
    customer: { name: "Lena Vogt", email: "lena.vogt@brightloop.example", country: "DE" },
    issuer: { bank: "Sparkasse Köln Bonn", country: "DE", language: "de", languageName: "German" },
    transaction: tx("ch_3Q9x", "2026-10-26T14:02:00Z", 238_800, "84.150.22.17", "dev_7f3a9c", "usr_4410"),
    history: [
      tx("ch_1Mar", "2026-03-02T10:41:00Z", 19_900, "84.150.22.17", "dev_7f3a9c", "usr_4410"),
      tx("ch_2Jun", "2026-06-20T08:12:00Z", 19_900, "84.150.22.17", "dev_7f3a9c", "usr_4410"),
      tx("ch_3Apr", "2026-04-15T19:30:00Z", 19_900, "91.64.5.200", "dev_0b2211", "usr_4410"),
      tx("ch_4Sep", "2026-09-26T11:05:00Z", 19_900, "84.150.22.17", "dev_7f3a9c", "usr_4410"),
    ],
    evidence: [
      { at: "2026-03-02T10:38:00Z", source: "auth0", text: "Account usr_4410 created; email lena.vogt@brightloop.example verified; login from 84.150.22.17 (Cologne, DE)." },
      { at: "2026-10-26T13:58:00Z", source: "auth0", text: "Successful login with MFA (TOTP) from 84.150.22.17, device dev_7f3a9c." },
      { at: "2026-10-26T14:02:00Z", source: "stripe", text: "Charge ch_3Q9x for $2,388.00 authorized with 3-D Secure frictionless; AVS and CVC match." },
      { at: "2026-10-26T14:10:00Z", source: "posthog", text: "Cardholder session: upgraded to Annual plan, invited 6 teammates, exported the Q3 revenue report." },
      { at: "2026-10-27T08:45:00Z", source: "posthog", text: "41 dashboard views and 3 scheduled report jobs created on usr_4410 from the same device." },
    ],
    tos: STANDARD_TOS,
  },
  {
    id: "dp_1QwB3nTc",
    gateway: "adyen",
    network: "visa",
    reasonCode: "13.1",
    reasonLabel: "Merchandise / services not received",
    amountCents: 89_000,
    currency: "USD",
    createdAt: "2026-10-27T16:40:00Z",
    dueBy: "2026-11-10",
    status: "new",
    customer: { name: "Rafael Moreira", email: "rafael@datasul.example", country: "BR" },
    issuer: { bank: "Itaú Unibanco", country: "BR", language: "pt-BR", languageName: "Portuguese (Brazil)" },
    transaction: tx("ch_8Zp2", "2026-09-30T12:20:00Z", 89_000, "187.45.101.9", "dev_c91e44", "usr_8821"),
    history: [],
    evidence: [
      { at: "2026-09-30T12:21:00Z", source: "stripe", text: "Charge ch_8Zp2 for $890.00 (Team plan, 6 months) captured." },
      { at: "2026-09-30T12:25:00Z", source: "auth0", text: "Workspace provisioned; API key issued to usr_8821." },
      { at: "2026-10-03T19:02:00Z", source: "posthog", text: "212 API calls from key ending ...a41c over 14 distinct sessions between Oct 1 and Oct 24." },
      { at: "2026-10-12T14:30:00Z", source: "posthog", text: "Customer connected the Salesforce integration and created 2 shared dashboards." },
      { at: "2026-10-20T09:15:00Z", source: "zendesk", text: "Ticket #5521: customer asked how to export CSVs; resolved in one reply, CSAT 5/5." },
    ],
    tos: [STANDARD_TOS[0], STANDARD_TOS[2]],
  },
  {
    id: "dp_1QxD7yWe",
    gateway: "stripe",
    network: "mastercard",
    reasonCode: "4853",
    reasonLabel: "Cardholder dispute - cancelled / refund not processed",
    amountCents: 149_000,
    currency: "USD",
    createdAt: "2026-10-26T07:55:00Z",
    dueBy: "2026-11-09",
    status: "new",
    customer: { name: "Haruto Ishikawa", email: "h.ishikawa@kitsune.example", country: "JP" },
    issuer: { bank: "MUFG Bank", country: "JP", language: "ja", languageName: "Japanese" },
    transaction: tx("ch_5Kd8", "2026-10-02T03:10:00Z", 149_000, "126.114.30.2", "dev_a1d0e8", "usr_3092"),
    history: [tx("ch_old", "2025-10-02T03:08:00Z", 149_000, "126.114.30.2", "dev_a1d0e8", "usr_3092")],
    evidence: [
      { at: "2026-10-02T03:10:00Z", source: "stripe", text: "Annual renewal ch_5Kd8 for $1,490.00 captured. Renewal reminder email sent 2026-09-18." },
      { at: "2026-10-11T05:22:00Z", source: "zendesk", text: "Ticket #5408 (day 9): customer writes \"Please cancel and refund the renewal, we no longer use the tool.\" Agent replied \"We will look into this\"; no further action recorded." },
      { at: "2026-10-18T02:00:00Z", source: "zendesk", text: "Ticket #5408 auto-closed after 7 days without a reply from the merchant." },
      { at: "2026-10-12T00:00:00Z", source: "posthog", text: "No sessions recorded for usr_3092 since 2026-09-21." },
    ],
    tos: STANDARD_TOS,
  },
  {
    id: "dp_1QyF2hRs",
    gateway: "braintree",
    network: "mastercard",
    reasonCode: "4837",
    reasonLabel: "No cardholder authorization",
    amountCents: 320_000,
    currency: "USD",
    createdAt: "2026-10-29T11:20:00Z",
    dueBy: "2026-11-12",
    status: "new",
    customer: { name: "Camille Roche", email: "camille.roche@orbis.example", country: "FR" },
    issuer: { bank: "BNP Paribas", country: "FR", language: "fr", languageName: "French" },
    transaction: tx("ch_9Lm4", "2026-10-21T17:48:00Z", 320_000, "90.12.77.140", "dev_55be09", "usr_6150"),
    history: [],
    evidence: [
      { at: "2026-10-21T17:40:00Z", source: "auth0", text: "New account usr_6150 signed up with a corporate email on the orbis.example domain; email verified." },
      { at: "2026-10-21T17:48:00Z", source: "stripe", text: "Charge ch_9Lm4 for $3,200.00 authorized with 3-D Secure challenge completed (SMS OTP)." },
      { at: "2026-10-22T09:02:00Z", source: "posthog", text: "Imported 18,400 rows from a CSV and connected a Postgres warehouse from 90.12.77.140." },
      { at: "2026-10-23T15:30:00Z", source: "zendesk", text: "Ticket #5577: customer asked for an invoice with VAT ID; invoice sent and acknowledged." },
    ],
    tos: [STANDARD_TOS[2]],
  },
  {
    id: "dp_1Qq0aaaa",
    gateway: "stripe",
    network: "visa",
    reasonCode: "10.4",
    reasonLabel: "Other fraud - card-absent environment",
    amountCents: 59_700,
    currency: "USD",
    createdAt: "2026-10-08T10:00:00Z",
    dueBy: "2026-10-22",
    status: "won",
    customer: { name: "Tomás Herrera", email: "tomas@ruta.example", country: "ES" },
    issuer: { bank: "Santander", country: "ES", language: "es", languageName: "Spanish" },
    transaction: tx("ch_w1", "2026-10-05T10:00:00Z", 59_700, "88.1.1.1", "dev_w1", "usr_w1"),
    history: [],
    evidence: [],
    tos: [],
  },
  {
    id: "dp_1Qq0bbbb",
    gateway: "adyen",
    network: "mastercard",
    reasonCode: "4853",
    reasonLabel: "Cardholder dispute",
    amountCents: 24_900,
    currency: "USD",
    createdAt: "2026-10-04T10:00:00Z",
    dueBy: "2026-10-18",
    status: "lost",
    customer: { name: "Anna Kowalska", email: "anna@vistula.example", country: "PL" },
    issuer: { bank: "PKO Bank Polski", country: "PL", language: "pl", languageName: "Polish" },
    transaction: tx("ch_l1", "2026-10-01T10:00:00Z", 24_900, "5.1.1.1", "dev_l1", "usr_l1"),
    history: [],
    evidence: [],
    tos: [],
  },
];

export function getDispute(id: string): Dispute | undefined {
  return DISPUTES.find((d) => d.id === id);
}

/**
 * Portfolio figures shown on the dashboard. Demo values - they stand in for
 * what the ledger of representments would produce.
 */
export const PORTFOLIO = {
  monthlyTransactions: 41_200,
  monthlyDisputes: 291,
  vdmpThreshold: 0.009,
  winRate: 0.74,
  industryWinRate: 0.43,
  medianMinutesToSubmit: 38,
  recoveredCents: 18_642_000,
  feeRate: 0.15,
};
