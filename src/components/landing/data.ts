import { auditCe3 } from "@/lib/ce3/audit";
import { getDemoCase } from "@/lib/demo/cases";
import type { CaseFile } from "@/lib/domain/types";
import { formatUtc, money } from "./format";

/*
 * Small, serialisable slices of the demo data for the landing page's client
 * islands. The 3D scene draws these records onto its paper in code; the CE 3.0
 * explainer re-runs the real audit engine on the CE 3.0 slices in the browser.
 */

function requireCase(id: string): CaseFile {
  const c = getDemoCase(id);
  if (!c) throw new Error(`Demo case ${id} missing`);
  return c;
}

export type SceneRecords = {
  notice: Array<[string, string]>;
  noticeTitle: string;
  claim: string;
  logins: string[];
  usage: string[];
  ticket: { title: string; lines: string[] };
  receipt: string[];
  priorReceipt: string[];
  tags: Array<{ id: string; lines: string[] }>;
  seal: { verdict: string; caseId: string; basis: string };
};

export function getSceneRecords(): SceneRecords {
  const c = requireCase("CG-1041");
  const { dispute, charge, sessions, tickets } = c;
  const audit = auditCe3(c);
  const qualifying = audit.applicable ? audit.candidates.filter((x) => x.qualifies) : [];
  const prior = c.priorTransactions;
  const ticket = tickets[0];
  const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

  return {
    noticeTitle: "Dispute notice",
    notice: [
      ["Case", dispute.id],
      ["Processor", `Stripe · ${dispute.processorDisputeId}`],
      ["Network", `Visa ${dispute.reasonCode}`],
      ["Amount", money(dispute.amount, dispute.currency)],
      ["Issuer", `${dispute.issuer.name} (${dispute.issuer.country})`],
      ["Opened", formatUtc(dispute.openedAt)],
      ["Evidence due", formatUtc(dispute.evidenceDueBy)],
      ["Charge", `${charge.id} · ${formatUtc(charge.createdAt)}`],
    ],
    claim: dispute.cardholderClaim,
    logins: sessions
      .filter((s) => s.source === "auth0")
      .map((s) => `${formatUtc(s.at)}  ${s.ip}  ${s.deviceId}  ${short(s.detail.replace("Login with ", ""), 22)}`),
    usage: sessions.filter((s) => s.source === "posthog").map((s) => `${formatUtc(s.at)}  ${short(s.detail, 46)}`),
    ticket: ticket
      ? {
          title: `${ticket.id} · ${ticket.subject} · ${ticket.status}`,
          lines: ticket.messages.map((m) => `${formatUtc(m.at)} ${m.author}: ${short(m.body, 120)}`),
        }
      : { title: "No tickets", lines: [] },
    receipt: [
      c.merchant.name.toUpperCase(),
      charge.description,
      charge.id,
      formatUtc(charge.createdAt),
      money(charge.amount, charge.currency),
      `IP ${charge.ip}`,
      `DEVICE ${charge.deviceId}`,
    ],
    priorReceipt: prior[prior.length - 1]
      ? [
          c.merchant.name.toUpperCase(),
          prior[prior.length - 1].description,
          prior[prior.length - 1].id,
          formatUtc(prior[prior.length - 1].createdAt),
          money(prior[prior.length - 1].amount, prior[prior.length - 1].currency),
        ]
      : [],
    tags: qualifying.slice(0, 3).map((q) => {
      const t = prior.find((p) => p.id === q.transactionId)!;
      return {
        id: q.transactionId,
        lines: [
          formatUtc(t.createdAt, false),
          `${q.ageDays} days`,
          money(t.amount, t.currency),
          q.matchedElements.join(" + "),
        ],
      };
    }),
    seal: {
      verdict: "Contest",
      caseId: dispute.id,
      basis: audit.applicable && audit.eligible ? "CE 3.0 met" : "CE 3.0 not met",
    },
  };
}

/** The CE 3.0 slices the explainer audits client-side. */
export type Ce3DemoCase = Pick<CaseFile, "dispute" | "charge" | "priorTransactions">;

export function getCe3Cases(): Ce3DemoCase[] {
  return ["CG-1041", "CG-1045"].map((id) => {
    const { dispute, charge, priorTransactions } = requireCase(id);
    return { dispute, charge, priorTransactions };
  });
}
