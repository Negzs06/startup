// Rule-based dossier: deterministic, no model call. Used for the demo when no
// ANTHROPIC_API_KEY is configured and as the fallback when the Claude call
// fails. Its output is labelled as rule-based throughout the UI.

import type { Ce3Audit } from "@/lib/ce3/audit";
import { REASON_CODES } from "@/lib/domain/reason-codes";
import type { CaseFile } from "@/lib/domain/types";
import { buildEvidenceIndex, TOS_ACCEPTANCE_REF } from "./evidence";
import { writeLetter, type LetterFact } from "./letters";
import type { ClaudeDossier, Dossier, HighlightedClause, TimelineEntry } from "./schema";
import type { CaseSignals } from "./signals";

type Requirement = ClaudeDossier["requirements"][number];

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

// Which clauses matter for which reason code, and the sentence to highlight.
const CLAUSE_PLAN: Record<string, Array<{ id: string; highlight: string; relevance: string }>> = {
  "10.4": [
    { id: "tos-7.3", highlight: "You are responsible for all activity that occurs under your account", relevance: "Cardholder is responsible for activity on their authenticated account." },
    { id: "tos-9.1", highlight: "usage is recorded in your workspace activity log", relevance: "Usage logs are the contractual record of delivery and participation." },
  ],
  "13.1": [
    { id: "tos-9.1", highlight: "Access to paid features is available immediately after a successful payment", relevance: "Service is delivered electronically and immediately on payment." },
    { id: "tos-4.5", highlight: "You may cancel your subscription at any time from Settings → Billing", relevance: "Cardholder had a self-serve cancellation path and did not use it." },
  ],
  "4837": [
    { id: "tos-7.3", highlight: "You are responsible for all activity that occurs under your account", relevance: "Purchase was made inside the cardholder's authenticated account." },
  ],
  "4853": [
    { id: "tos-4.2", highlight: "Paid plans renew automatically at the end of each billing period", relevance: "Automatic renewal was disclosed and accepted." },
    { id: "tos-4.5", highlight: "Cancellation takes effect at the end of the current billing period", relevance: "Cancellation terms define when a cancellation stops billing." },
    { id: "tos-6.1", highlight: "within 14 days of a charge, we will refund that charge in full", relevance: "Refund window the merchant committed to." },
  ],
};

function requirementsFor(caseFile: CaseFile, ce3: Ce3Audit, s: CaseSignals): Requirement[] {
  const usageRefs = caseFile.sessions.filter((x) => x.at > caseFile.charge.createdAt).map((x) => x.id);
  const loginRef = s.knownDeviceLogin ? [s.knownDeviceLogin.sessionId] : [];
  const priorRefs = caseFile.priorTransactions.filter((t) => !t.disputed).map((t) => t.id);
  const ticketRefs = s.refundRequests.map((r) => r.ticketId);
  const status = (ok: boolean, partial = false): Requirement["status"] => (ok ? "met" : partial ? "partial" : "not_met");
  const [r1, r2, r3] = REASON_CODES[caseFile.dispute.reasonCode].requirements;

  switch (caseFile.dispute.reasonCode) {
    case "10.4": {
      const qualifying = ce3.applicable ? ce3.candidates.filter((c) => c.qualifies).map((c) => c.transactionId) : [];
      return [
        { requirement: r1, status: status(s.usageAfterCharge.count >= 2, s.usageAfterCharge.count > 0), note: `${plural(s.usageAfterCharge.count, "account event")} after the charge.`, evidenceRefs: usageRefs },
        { requirement: r2, status: status(Boolean(s.knownDeviceLogin)), note: s.knownDeviceLogin ? "Login at purchase time from a device seen on prior payments." : "No login from a known device near the purchase.", evidenceRefs: loginRef },
        { requirement: r3, status: ce3.applicable && ce3.eligible ? "met" : qualifying.length > 0 ? "partial" : "not_met", note: ce3.applicable ? ce3.summary : ce3.reason, evidenceRefs: qualifying },
      ];
    }
    case "13.1":
      return [
        { requirement: r1, status: "met", note: "Digital service, available immediately after payment (ToS 9.1).", evidenceRefs: [caseFile.charge.id, TOS_ACCEPTANCE_REF] },
        { requirement: r2, status: status(s.usageAfterCharge.count >= 2, s.usageAfterCharge.count > 0), note: `${plural(s.usageAfterCharge.count, "account event")} after the charge.`, evidenceRefs: usageRefs },
        { requirement: r3, status: status(s.refundRequests.length === 0 && !s.cancellationRecorded), note: s.refundRequests.length ? "A refund request exists on file." : "No cancellation or refund request before the dispute.", evidenceRefs: ticketRefs },
      ];
    case "4837":
      return [
        { requirement: r1, status: status(Boolean(s.knownDeviceLogin)), note: s.knownDeviceLogin ? `Purchase session on device ${caseFile.charge.deviceId}, which also made earlier undisputed payments.` : "No known-device login at purchase time.", evidenceRefs: loginRef },
        { requirement: r2, status: status(Boolean(s.strongAuthAtPurchase), Boolean(s.knownDeviceLogin)), note: s.strongAuthAtPurchase?.detail ?? "Authentication method not strong or not recorded.", evidenceRefs: s.strongAuthAtPurchase ? [s.strongAuthAtPurchase.sessionId] : [] },
        { requirement: r3, status: status(priorRefs.length >= 2, priorRefs.length === 1), note: `${plural(priorRefs.length, "prior undisputed payment")} on this account.`, evidenceRefs: priorRefs },
      ];
    case "4853": {
      const lateOnly = s.refundRequests.length > 0 && s.refundRequests.every((r) => !r.withinRefundWindow);
      return [
        { requirement: r1, status: status(s.usageAfterCharge.count > 0), note: s.usageAfterCharge.count ? `${plural(s.usageAfterCharge.count, "account event")} after the charge.` : "No usage after the charge.", evidenceRefs: usageRefs },
        { requirement: r2, status: "met", note: `Terms v${caseFile.tos.version} accepted; renewal, cancellation and refund terms disclosed.`, evidenceRefs: [TOS_ACCEPTANCE_REF] },
        {
          requirement: r3,
          status: s.merchantAtFault ? "not_met" : lateOnly || s.refundRequests.length === 0 ? "met" : "partial",
          note: s.merchantAtFault
            ? "Cardholder asked for a refund inside the refund window and was not answered."
            : lateOnly
              ? "Refund requested only after the refund window closed; no cancellation recorded."
              : "No cancellation or refund request in line with the terms.",
          evidenceRefs: ticketRefs,
        },
      ];
    }
  }
}

function buildTimeline(caseFile: CaseFile, ce3: Ce3Audit, s: CaseSignals): TimelineEntry[] {
  const index = buildEvidenceIndex(caseFile);
  const qualifying = new Set(ce3.applicable ? ce3.candidates.filter((c) => c.qualifies).map((c) => c.transactionId) : []);
  const undisputedPriors = caseFile.priorTransactions.filter((t) => !t.disputed);
  // Keep the timeline readable: CE 3.0 transactions when they exist, otherwise the most recent priors.
  const priors = qualifying.size ? undisputedPriors.filter((t) => qualifying.has(t.id)) : undisputedPriors.slice(0, 2);
  const keyRefs = new Set([caseFile.charge.id, s.knownDeviceLogin?.sessionId, ...s.refundRequests.map((r) => r.ticketId)]);

  const entries: TimelineEntry[] = [
    { ref: TOS_ACCEPTANCE_REF, title: "Terms of Service accepted", detail: `Version ${caseFile.tos.version}, from IP ${caseFile.tos.acceptedIp}.` },
    ...priors.map((t) => ({ ref: t.id, title: qualifying.has(t.id) ? "Prior undisputed payment (CE 3.0)" : "Prior undisputed payment", detail: t.description })),
    { ref: caseFile.charge.id, title: "Disputed charge", detail: `${caseFile.charge.description}; IP ${caseFile.charge.ip}, device ${caseFile.charge.deviceId}.` },
    ...caseFile.sessions.map((x) => ({ ref: x.id, title: x.kind === "login" ? "Sign-in" : "Product usage", detail: `${x.detail} (IP ${x.ip}, device ${x.deviceId}).` })),
    ...caseFile.tickets.map((t) => ({ ref: t.id, title: `Support ticket ${t.id}`, detail: `"${t.subject}" — ${t.status}, ${t.messages.filter((m) => m.author === "agent").length} agent replies.` })),
  ].map((e) => {
    const item = index.get(e.ref)!;
    const afterCharge = item.at > caseFile.charge.createdAt;
    const significance: TimelineEntry["significance"] = keyRefs.has(e.ref) ? "key" : afterCharge || qualifying.has(e.ref) ? "supporting" : "context";
    return { ...e, at: item.at, source: item.source, significance };
  });
  return entries.sort((a, b) => a.at.localeCompare(b.at));
}

export function buildClauses(caseFile: CaseFile, plan: Array<{ id: string; highlight: string; relevance: string }>): HighlightedClause[] {
  return plan.flatMap((p) => {
    const clause = caseFile.tos.clauses.find((c) => c.id === p.id);
    if (!clause) return [];
    return [{ clauseId: clause.id, title: clause.title, text: clause.text, highlight: clause.text.includes(p.highlight) ? p.highlight : null, relevance: p.relevance }];
  });
}

function letterFacts(caseFile: CaseFile, ce3: Ce3Audit, s: CaseSignals): LetterFact[] {
  const facts: LetterFact[] = [];
  if (ce3.applicable && ce3.eligible) facts.push({ kind: "ce3", count: ce3.qualifyingCount });
  if (s.knownDeviceLogin) facts.push({ kind: "knownDevice", at: s.knownDeviceLogin.at });
  if (s.strongAuthAtPurchase) facts.push({ kind: "strongAuth" });
  if (s.usageAfterCharge.count > 0 && s.usageAfterCharge.lastAt) facts.push({ kind: "usage", count: s.usageAfterCharge.count, lastAt: s.usageAfterCharge.lastAt });
  if (REASON_CODES[caseFile.dispute.reasonCode].category === "consumer" && !s.cancellationRecorded) facts.push({ kind: "noCancellation" });
  const late = s.refundRequests.find((r) => !r.withinRefundWindow);
  if (late) facts.push({ kind: "refundOutsideWindow", days: late.daysAfterCharge, windowDays: caseFile.merchant.refundWindowDays });
  facts.push({ kind: "tos", version: caseFile.tos.version, acceptedAt: caseFile.tos.acceptedAt });
  return facts;
}

function decide(caseFile: CaseFile, ce3: Ce3Audit, s: CaseSignals, requirements: Requirement[]): Dossier["verdict"] {
  if (s.merchantAtFault) {
    const ask = s.refundRequests.find((r) => r.withinRefundWindow && !r.answeredBeforeDispute)!;
    return {
      decision: "accept",
      confidence: "high",
      rationale: `The cardholder asked for a refund in ticket ${ask.ticketId} ${ask.daysAfterCharge} days after the charge, inside the ${caseFile.merchant.refundWindowDays}-day refund window, and support never replied before the dispute was filed. Under the merchant's own terms the refund was owed; contesting would likely lose and count against the dispute ratio. Accept and fix the support gap.`,
    };
  }
  const met = requirements.filter((r) => r.status === "met").length;
  const confidence: Dossier["verdict"]["confidence"] = met === requirements.length ? "high" : met >= requirements.length - 1 ? "medium" : "low";
  const ce3Note = ce3.applicable ? (ce3.eligible ? " CE 3.0 conditions are met, shifting liability back to the issuer." : " CE 3.0 cannot be invoked, so the case rests on usage and device evidence alone.") : "";
  return {
    decision: "contest",
    confidence,
    rationale: `${met} of ${requirements.length} representment requirements are met by the records on file.${ce3Note}${s.usageAfterCharge.count ? ` The account was used ${plural(s.usageAfterCharge.count, "time")} after the charge.` : ""}`,
  };
}

export function buildRuleBasedDossier(caseFile: CaseFile, ce3: Ce3Audit, signals: CaseSignals): Dossier {
  const { dispute, merchant, charge } = caseFile;
  const info = REASON_CODES[dispute.reasonCode];
  const requirements = requirementsFor(caseFile, ce3, signals);
  const verdict = decide(caseFile, ce3, signals, requirements);
  const clauses = buildClauses(caseFile, CLAUSE_PLAN[dispute.reasonCode] ?? []);
  const letterInput = {
    merchantName: merchant.name,
    issuerName: dispute.issuer.name,
    disputeId: dispute.id,
    processorDisputeId: dispute.processorDisputeId,
    reasonLabel: `${info.network === "visa" ? "Visa" : "Mastercard"} ${info.code}`,
    amount: dispute.amount,
    currency: dispute.currency,
    chargeAt: charge.createdAt,
    decision: verdict.decision,
    facts: letterFacts(caseFile, ce3, signals),
    clauseTitles: clauses.map((c) => c.title),
  };

  const evidenceGaps: string[] = [];
  for (const r of requirements) if (r.status !== "met") evidenceGaps.push(`${r.requirement}: ${r.note}`);
  if (!caseFile.tickets.length) evidenceGaps.push("No support history on file to show the cardholder's relationship with the merchant.");

  return {
    verdict,
    reasonCodeSummary: `${info.label}. ${info.category === "fraud" ? "The cardholder claims they did not make the purchase; evidence must tie them to it." : "The cardholder disputes the service itself; evidence must show delivery and adherence to the disclosed terms."}`,
    requirements,
    timeline: buildTimeline(caseFile, ce3, signals),
    clauses,
    coverLetter: {
      language: dispute.issuer.language,
      localized: writeLetter(dispute.issuer.language, letterInput),
      english: writeLetter("en", letterInput),
    },
    evidenceGaps,
    injectionFlags: signals.injectionAttempts.map(
      (a) => `Ticket ${a.ticketId} contains text addressed to an automated reviewer: "${a.excerpt}". It was treated as data, not instructions.`,
    ),
  };
}
