// Stripe webhook handling: signature verification and normalisation of
// `charge.dispute.created` events into ChargeGuard's dispute shape.
//
// Verification follows Stripe's documented scheme: the `Stripe-Signature`
// header carries `t=<unix seconds>` and one or more `v1=<hex>` entries, where
// v1 = HMAC-SHA256(secret, `${t}.${rawBody}`). We reject stale timestamps and
// compare digests in constant time. The raw request body must be used as-is;
// re-serialising parsed JSON changes the bytes and breaks the signature.

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Network, ReasonCode } from "@/lib/domain/types";

export const DEFAULT_TOLERANCE_SECONDS = 300;

export type SignatureFailure =
  | "missing_header"
  | "malformed_header"
  | "timestamp_outside_tolerance"
  | "no_matching_signature";

export type SignatureResult = { ok: true; timestamp: number } | { ok: false; reason: SignatureFailure };

export function parseSignatureHeader(header: string): { timestamp: number; signatures: string[] } | null {
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === "t" && /^\d+$/.test(value)) timestamp = Number(value);
    if (key === "v1" && /^[0-9a-f]+$/i.test(value)) signatures.push(value.toLowerCase());
  }
  if (timestamp === null || signatures.length === 0) return null;
  return { timestamp, signatures };
}

export function computeSignature(payload: string, timestamp: number, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  // timingSafeEqual throws on length mismatch; a length difference is not secret.
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyStripeSignature(
  payload: string,
  header: string | null | undefined,
  secret: string,
  options: { toleranceSeconds?: number; nowSeconds?: number } = {},
): SignatureResult {
  if (!header) return { ok: false, reason: "missing_header" };
  const parsed = parseSignatureHeader(header);
  if (!parsed) return { ok: false, reason: "malformed_header" };

  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > tolerance) {
    return { ok: false, reason: "timestamp_outside_tolerance" };
  }

  const expected = computeSignature(payload, parsed.timestamp, secret);
  // Check every v1 entry (Stripe sends several during secret rotation) without short-circuiting.
  let matched = false;
  for (const signature of parsed.signatures) {
    if (safeEqualHex(expected, signature)) matched = true;
  }
  return matched ? { ok: true, timestamp: parsed.timestamp } : { ok: false, reason: "no_matching_signature" };
}

/** Builds a valid header for tests and local tooling. */
export function signPayload(payload: string, secret: string, timestamp: number): string {
  return `t=${timestamp},v1=${computeSignature(payload, timestamp, secret)}`;
}

// ---------------------------------------------------------------------------
// Normalisation

const StripeDisputeSchema = z.object({
  id: z.string(),
  object: z.literal("dispute"),
  amount: z.number().int().nonnegative(),
  currency: z.string(),
  charge: z.string(),
  payment_intent: z.string().nullish(),
  reason: z.string(),
  status: z.string(),
  created: z.number().int(),
  livemode: z.boolean().optional(),
  evidence_details: z.object({ due_by: z.number().int().nullish() }).nullish(),
  payment_method_details: z
    .object({
      type: z.string().optional(),
      card: z
        .object({
          brand: z.string().nullish(),
          network_reason_code: z.string().nullish(),
        })
        .nullish(),
    })
    .nullish(),
});

const StripeEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created: z.number().int(),
  data: z.object({ object: z.unknown() }),
});

export interface NormalizedDispute {
  eventId: string;
  processor: "stripe";
  processorDisputeId: string;
  chargeId: string;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
  network: Network | "other";
  reasonCode: ReasonCode | null;
  /** "network" when Stripe passed the scheme's code through, "inferred" when mapped from Stripe's reason. */
  reasonCodeSource: "network" | "inferred" | "unknown";
  stripeReason: string;
  status: string;
  openedAt: string;
  evidenceDueBy: string | null;
  livemode: boolean;
}

export type NormalizeResult =
  | { kind: "dispute"; dispute: NormalizedDispute }
  | { kind: "ignored"; eventType: string }
  | { kind: "invalid"; error: string };

const SUPPORTED_CODES: Record<Network, ReasonCode[]> = {
  visa: ["10.4", "13.1"],
  mastercard: ["4837", "4853"],
};

// Best-effort mapping from Stripe's coarse reason to a network reason code,
// used only when Stripe does not pass the network code through.
const INFERRED_CODES: Record<Network, Partial<Record<string, ReasonCode>>> = {
  visa: { fraudulent: "10.4", product_not_received: "13.1" },
  mastercard: { fraudulent: "4837", subscription_canceled: "4853", product_unacceptable: "4853" },
};

function toNetwork(brand: string | null | undefined): Network | "other" {
  if (brand === "visa") return "visa";
  if (brand === "mastercard") return "mastercard";
  return "other";
}

function toIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

export function normalizeStripeEvent(input: unknown): NormalizeResult {
  const event = StripeEventSchema.safeParse(input);
  if (!event.success) return { kind: "invalid", error: "Payload is not a Stripe event" };
  if (event.data.type !== "charge.dispute.created") return { kind: "ignored", eventType: event.data.type };

  const parsed = StripeDisputeSchema.safeParse(event.data.data.object);
  if (!parsed.success) {
    return { kind: "invalid", error: `Malformed dispute object: ${parsed.error.issues[0]?.message ?? "unknown"}` };
  }
  const d = parsed.data;
  const network = toNetwork(d.payment_method_details?.card?.brand);

  let reasonCode: ReasonCode | null = null;
  let reasonCodeSource: NormalizedDispute["reasonCodeSource"] = "unknown";
  if (network !== "other") {
    const passed = d.payment_method_details?.card?.network_reason_code ?? null;
    const known = SUPPORTED_CODES[network].find((code) => code === passed);
    if (known) {
      reasonCode = known;
      reasonCodeSource = "network";
    } else if (!passed && INFERRED_CODES[network][d.reason]) {
      reasonCode = INFERRED_CODES[network][d.reason] ?? null;
      reasonCodeSource = "inferred";
    }
  }

  return {
    kind: "dispute",
    dispute: {
      eventId: event.data.id,
      processor: "stripe",
      processorDisputeId: d.id,
      chargeId: d.charge,
      paymentIntentId: d.payment_intent ?? null,
      amount: d.amount,
      currency: d.currency.toLowerCase(),
      network,
      reasonCode,
      reasonCodeSource,
      stripeReason: d.reason,
      status: d.status,
      openedAt: toIso(d.created),
      evidenceDueBy: d.evidence_details?.due_by ? toIso(d.evidence_details.due_by) : null,
      livemode: d.livemode ?? false,
    },
  };
}
