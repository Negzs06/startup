import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 300;

/**
 * Verifies a Stripe-Signature header (`t=<unix>,v1=<hmac>[,v1=...]`) against
 * the raw request body, using the scheme documented by Stripe: HMAC-SHA256 of
 * `${t}.${body}` with the endpoint secret, rejecting stale timestamps.
 */
export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!header) return false;

  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value ?? "";
    else if (key === "v1" && value) signatures.push(value);
  }

  const t = Number(timestamp);
  if (!Number.isFinite(t) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - t) > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  return signatures.some((sig) => {
    const candidate = Buffer.from(sig, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

export interface IncomingDispute {
  gateway: "stripe";
  id: string;
  chargeId: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  dueBy: string | null;
  network: string | null;
  reasonCode: string | null;
  gatewayReason: string;
}

interface StripeDisputeEvent {
  type?: string;
  data?: {
    object?: {
      id?: string;
      charge?: string;
      amount?: number;
      currency?: string;
      created?: number;
      reason?: string;
      evidence_details?: { due_by?: number | null };
      payment_method_details?: { card?: { brand?: string; network_reason_code?: string | null } };
    };
  };
}

/** Maps a `charge.dispute.created` event to the internal shape; null for other event types or malformed payloads. */
export function normalizeStripeDispute(event: StripeDisputeEvent): IncomingDispute | null {
  if (event.type !== "charge.dispute.created") return null;
  const d = event.data?.object;
  if (!d?.id || !d.charge || typeof d.amount !== "number" || !d.currency || !d.created) return null;

  const brand = d.payment_method_details?.card?.brand ?? null;
  return {
    gateway: "stripe",
    id: d.id,
    chargeId: d.charge,
    amountCents: d.amount,
    currency: d.currency.toUpperCase(),
    createdAt: new Date(d.created * 1000).toISOString(),
    dueBy: d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000).toISOString() : null,
    network: brand,
    reasonCode: d.payment_method_details?.card?.network_reason_code ?? null,
    gatewayReason: d.reason ?? "general",
  };
}
