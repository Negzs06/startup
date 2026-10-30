import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { normalizeStripeDispute, verifyStripeSignature } from "../src/lib/stripe-webhook";

const secret = "whsec_test";
const now = 1_790_000_000;
const sign = (body: string, t = now) =>
  `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

test("accepts a valid signature", () => {
  const body = '{"a":1}';
  assert.equal(verifyStripeSignature(body, sign(body), secret, now), true);
});

test("rejects a tampered body, wrong secret, missing header and stale timestamp", () => {
  const body = '{"a":1}';
  assert.equal(verifyStripeSignature('{"a":2}', sign(body), secret, now), false);
  assert.equal(verifyStripeSignature(body, sign(body), "other", now), false);
  assert.equal(verifyStripeSignature(body, null, secret, now), false);
  assert.equal(verifyStripeSignature(body, sign(body, now - 301), secret, now), false);
});

test("normalizes charge.dispute.created and ignores other events", () => {
  const event = {
    type: "charge.dispute.created",
    data: {
      object: {
        id: "dp_1",
        charge: "ch_1",
        amount: 238800,
        currency: "usd",
        created: 1_790_000_000,
        reason: "fraudulent",
        evidence_details: { due_by: 1_791_000_000 },
        payment_method_details: { card: { brand: "visa", network_reason_code: "10.4" } },
      },
    },
  };
  const d = normalizeStripeDispute(event)!;
  assert.equal(d.currency, "USD");
  assert.equal(d.reasonCode, "10.4");
  assert.equal(d.network, "visa");
  assert.equal(normalizeStripeDispute({ type: "charge.succeeded" }), null);
  assert.equal(normalizeStripeDispute({ type: "charge.dispute.created", data: { object: {} } }), null);
});
