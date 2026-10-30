import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeStripeEvent,
  parseSignatureHeader,
  signPayload,
  verifyStripeSignature,
} from "@/lib/stripe/webhook";

const SECRET = "whsec_test_secret";
const NOW = 1_790_000_000;

function disputeEvent(overrides: Record<string, unknown> = {}, card: Record<string, unknown> = {}) {
  return {
    id: "evt_123",
    object: "event",
    type: "charge.dispute.created",
    created: NOW,
    data: {
      object: {
        id: "dp_123",
        object: "dispute",
        amount: 12900,
        currency: "EUR",
        charge: "ch_123",
        payment_intent: "pi_123",
        reason: "fraudulent",
        status: "needs_response",
        created: NOW,
        livemode: false,
        evidence_details: { due_by: NOW + 7 * 86400 },
        payment_method_details: { type: "card", card: { brand: "visa", network_reason_code: "10.4", ...card } },
        ...overrides,
      },
    },
  };
}

describe("verifyStripeSignature", () => {
  const payload = JSON.stringify(disputeEvent());

  it("accepts a correctly signed payload", () => {
    const header = signPayload(payload, SECRET, NOW);
    assert.deepEqual(verifyStripeSignature(payload, header, SECRET, { nowSeconds: NOW }), { ok: true, timestamp: NOW });
  });

  it("accepts when any of several v1 signatures matches (secret rotation)", () => {
    const good = signPayload(payload, SECRET, NOW).split(",")[1];
    const header = `t=${NOW},v1=${"0".repeat(64)},${good},v0=deadbeef`;
    assert.equal(verifyStripeSignature(payload, header, SECRET, { nowSeconds: NOW }).ok, true);
  });

  it("rejects a tampered body", () => {
    const header = signPayload(payload, SECRET, NOW);
    const result = verifyStripeSignature(payload.replace("12900", "1"), header, SECRET, { nowSeconds: NOW });
    assert.deepEqual(result, { ok: false, reason: "no_matching_signature" });
  });

  it("rejects the wrong secret", () => {
    const header = signPayload(payload, "whsec_other", NOW);
    assert.equal(verifyStripeSignature(payload, header, SECRET, { nowSeconds: NOW }).ok, false);
  });

  it("enforces the timestamp tolerance in both directions", () => {
    const header = signPayload(payload, SECRET, NOW);
    assert.equal(verifyStripeSignature(payload, header, SECRET, { nowSeconds: NOW + 300 }).ok, true);
    assert.deepEqual(verifyStripeSignature(payload, header, SECRET, { nowSeconds: NOW + 301 }), {
      ok: false,
      reason: "timestamp_outside_tolerance",
    });
    assert.equal(verifyStripeSignature(payload, header, SECRET, { nowSeconds: NOW - 301 }).ok, false);
  });

  it("rejects missing and malformed headers", () => {
    assert.deepEqual(verifyStripeSignature(payload, null, SECRET), { ok: false, reason: "missing_header" });
    assert.deepEqual(verifyStripeSignature(payload, "garbage", SECRET), { ok: false, reason: "malformed_header" });
    assert.deepEqual(verifyStripeSignature(payload, `t=${NOW}`, SECRET), { ok: false, reason: "malformed_header" });
  });

  it("rejects a signature of the wrong length without throwing", () => {
    const header = `t=${NOW},v1=abcd`;
    assert.deepEqual(verifyStripeSignature(payload, header, SECRET, { nowSeconds: NOW }), {
      ok: false,
      reason: "no_matching_signature",
    });
  });

  it("parses the header", () => {
    assert.deepEqual(parseSignatureHeader("t=1, v1=AB ,v1=cd"), { timestamp: 1, signatures: ["ab", "cd"] });
  });
});

describe("normalizeStripeEvent", () => {
  it("normalises a Visa 10.4 dispute", () => {
    const result = normalizeStripeEvent(disputeEvent());
    assert.equal(result.kind, "dispute");
    if (result.kind !== "dispute") return;
    assert.deepEqual(result.dispute, {
      eventId: "evt_123",
      processor: "stripe",
      processorDisputeId: "dp_123",
      chargeId: "ch_123",
      paymentIntentId: "pi_123",
      amount: 12900,
      currency: "eur",
      network: "visa",
      reasonCode: "10.4",
      reasonCodeSource: "network",
      stripeReason: "fraudulent",
      status: "needs_response",
      openedAt: new Date(NOW * 1000).toISOString(),
      evidenceDueBy: new Date((NOW + 7 * 86400) * 1000).toISOString(),
      livemode: false,
    });
  });

  it("infers a Mastercard code when the network code is absent", () => {
    const result = normalizeStripeEvent(
      disputeEvent({ reason: "subscription_canceled" }, { brand: "mastercard", network_reason_code: null }),
    );
    assert.ok(result.kind === "dispute");
    assert.equal(result.dispute.reasonCode, "4853");
    assert.equal(result.dispute.reasonCodeSource, "inferred");
  });

  it("leaves unsupported network codes unmapped rather than guessing", () => {
    const result = normalizeStripeEvent(disputeEvent({}, { network_reason_code: "12.6.1" }));
    assert.ok(result.kind === "dispute");
    assert.equal(result.dispute.reasonCode, null);
    assert.equal(result.dispute.reasonCodeSource, "unknown");
  });

  it("ignores other event types", () => {
    assert.deepEqual(normalizeStripeEvent({ ...disputeEvent(), type: "charge.succeeded" }), {
      kind: "ignored",
      eventType: "charge.succeeded",
    });
  });

  it("flags malformed payloads", () => {
    assert.equal(normalizeStripeEvent({ hello: "world" }).kind, "invalid");
    assert.equal(normalizeStripeEvent(disputeEvent({ amount: "lots" })).kind, "invalid");
  });

  it("handles a missing evidence deadline and unknown brands", () => {
    const result = normalizeStripeEvent(
      disputeEvent({ evidence_details: null, payment_method_details: { card: { brand: "amex" } } }),
    );
    assert.ok(result.kind === "dispute");
    assert.equal(result.dispute.evidenceDueBy, null);
    assert.equal(result.dispute.network, "other");
    assert.equal(result.dispute.reasonCode, null);
  });
});
