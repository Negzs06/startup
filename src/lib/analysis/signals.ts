// Deterministic facts derived from the case file. Both analysis paths use
// them; the merchant-fault signal is also enforced as a hard policy on
// the model's verdict (see ground.ts).

import { daysBetween } from "@/lib/ce3/audit";
import type { CaseFile } from "@/lib/domain/types";

// Multilingual cues for "please refund me". Deliberately broad: a false
// positive only pushes a case towards review / accepting, never towards contesting.
const REFUND_PATTERN =
  /refund|money back|charge ?back|reembols|devolu[cç]|estorno|rembours|r[üu]ckerstatt|erstatt|geld zur[üu]ck|返金|払い戻し|返品/i;

// Text addressed to an automated reviewer rather than to support staff.
const INJECTION_PATTERN =
  /ignore (all |any )?(previous|prior|above) instructions|system (note|prompt|message)|ai reviewer|as an ai|you are now|disregard (the|your) (rules|instructions)/i;

export interface RefundRequest {
  ticketId: string;
  at: string;
  daysAfterCharge: number;
  withinRefundWindow: boolean;
  answeredBeforeDispute: boolean;
}

export interface CaseSignals {
  refundRequests: RefundRequest[];
  /** An unanswered refund request inside the refund window: the merchant should accept. */
  merchantAtFault: boolean;
  usageAfterCharge: { count: number; lastAt: string | null };
  /** Login on a device that also appears on earlier undisputed payments. */
  knownDeviceLogin: { sessionId: string; at: string; detail: string } | null;
  strongAuthAtPurchase: { sessionId: string; detail: string } | null;
  cancellationRecorded: boolean;
  injectionAttempts: Array<{ ticketId: string; excerpt: string }>;
}

export function computeSignals(caseFile: CaseFile): CaseSignals {
  const { charge, dispute, merchant, sessions, tickets, priorTransactions } = caseFile;

  const refundRequests: RefundRequest[] = [];
  const injectionAttempts: CaseSignals["injectionAttempts"] = [];
  for (const ticket of tickets) {
    const firstRefundAsk = ticket.messages.find((m) => m.author === "customer" && REFUND_PATTERN.test(m.body));
    if (firstRefundAsk) {
      const daysAfterCharge = daysBetween(charge.createdAt, firstRefundAsk.at);
      const answeredBeforeDispute = ticket.messages.some(
        (m) => m.author === "agent" && m.at > firstRefundAsk.at && m.at < dispute.openedAt,
      );
      refundRequests.push({
        ticketId: ticket.id,
        at: firstRefundAsk.at,
        daysAfterCharge,
        withinRefundWindow: daysAfterCharge >= 0 && daysAfterCharge <= merchant.refundWindowDays,
        answeredBeforeDispute,
      });
    }
    for (const message of ticket.messages) {
      if (message.author !== "customer") continue;
      const match = INJECTION_PATTERN.exec(message.body);
      if (match) {
        const start = Math.max(0, match.index - 20);
        injectionAttempts.push({ ticketId: ticket.id, excerpt: message.body.slice(start, match.index + 80).trim() });
      }
    }
  }

  const after = sessions.filter((s) => s.at > charge.createdAt).sort((a, b) => a.at.localeCompare(b.at));
  const priorDevices = new Set(priorTransactions.filter((t) => !t.disputed).map((t) => t.deviceId));
  const purchaseWindow = sessions.filter(
    (s) => s.source === "auth0" && s.kind === "login" && Math.abs(Date.parse(s.at) - Date.parse(charge.createdAt)) <= 30 * 60_000,
  );
  const knownDevice = purchaseWindow.find((s) => priorDevices.has(s.deviceId)) ?? null;
  const strongAuth = purchaseWindow.find((s) => /mfa|passkey|webauthn|sso/i.test(s.detail)) ?? null;

  return {
    refundRequests,
    merchantAtFault: refundRequests.some((r) => r.withinRefundWindow && !r.answeredBeforeDispute),
    usageAfterCharge: { count: after.length, lastAt: after.at(-1)?.at ?? null },
    knownDeviceLogin: knownDevice ? { sessionId: knownDevice.id, at: knownDevice.at, detail: knownDevice.detail } : null,
    strongAuthAtPurchase: strongAuth ? { sessionId: strongAuth.id, detail: strongAuth.detail } : null,
    cancellationRecorded: sessions.some((s) => s.kind === "settings_change" && /cancel/i.test(s.detail)),
    injectionAttempts,
  };
}
