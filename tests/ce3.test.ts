import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { auditCe3, evaluateCandidate, matchElements, daysBetween } from "@/lib/ce3/audit";
import type { Dispute, Transaction } from "@/lib/domain/types";

const DISPUTED_AT = "2026-10-01T12:00:00.000Z";

function daysBefore(days: number): string {
  return new Date(Date.parse(DISPUTED_AT) - days * 86_400_000).toISOString();
}

const charge: Transaction = {
  id: "ch_disputed",
  createdAt: DISPUTED_AT,
  amount: 4900,
  currency: "eur",
  description: "Pro plan",
  disputed: true,
  ip: "203.0.113.7",
  deviceId: "dev_abc",
  accountId: "acct_42",
  shippingAddress: "Hauptstraße 1, 10115 Berlin",
};

function prior(id: string, days: number, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id,
    createdAt: daysBefore(days),
    amount: 4900,
    currency: "eur",
    description: "Pro plan",
    disputed: false,
    ip: charge.ip,
    deviceId: charge.deviceId,
    accountId: charge.accountId,
    ...overrides,
  };
}

function dispute(overrides: Partial<Dispute> = {}): Dispute {
  return {
    id: "dsp_1",
    processor: "stripe",
    processorDisputeId: "dp_1",
    network: "visa",
    reasonCode: "10.4",
    amount: 4900,
    currency: "eur",
    openedAt: "2026-10-20T00:00:00.000Z",
    evidenceDueBy: "2026-11-05T00:00:00.000Z",
    status: "needs_review",
    issuer: { name: "Test Bank", country: "DE", language: "de" },
    cardholderClaim: "I did not make this purchase.",
    ...overrides,
  };
}

describe("daysBetween", () => {
  it("floors partial days", () => {
    assert.equal(daysBetween("2026-01-01T00:00:00Z", "2026-01-02T23:59:59Z"), 1);
  });
});

describe("matchElements", () => {
  it("normalises addresses and account IDs", () => {
    const matched = matchElements(
      { accountId: "ACCT_42", shippingAddress: "Hauptstraße 1, 10115   Berlin" },
      { accountId: "acct_42", shippingAddress: "hauptstraße 1 10115 berlin" },
    );
    assert.deepEqual(matched, ["accountId", "shippingAddress"]);
  });

  it("ignores missing and blank values", () => {
    assert.deepEqual(matchElements({ ip: "", deviceId: undefined }, { ip: "", deviceId: undefined }), []);
  });
});

describe("evaluateCandidate", () => {
  it("accepts both window boundaries (120 and 365 days)", () => {
    assert.equal(evaluateCandidate(charge, prior("a", 120)).qualifies, true);
    assert.equal(evaluateCandidate(charge, prior("b", 365)).qualifies, true);
  });

  it("rejects transactions just outside the window", () => {
    const young = evaluateCandidate(charge, prior("a", 119));
    const old = evaluateCandidate(charge, prior("b", 366));
    assert.equal(young.qualifies, false);
    assert.equal(old.qualifies, false);
    assert.equal(!young.qualifies && young.reason, "too_recent");
    assert.equal(!old.qualifies && old.reason, "too_old");
  });

  it("rejects previously disputed transactions", () => {
    const result = evaluateCandidate(charge, prior("a", 200, { disputed: true }));
    assert.equal(!result.qualifies && result.reason, "disputed");
  });

  it("requires two matching elements", () => {
    const result = evaluateCandidate(charge, prior("a", 200, { deviceId: "other", accountId: "other" }));
    assert.deepEqual(result.matchedElements, ["ip"]);
    assert.equal(!result.qualifies && result.reason, "insufficient_matches");
  });

  it("requires IP or device ID among the matches", () => {
    const result = evaluateCandidate(
      charge,
      prior("a", 200, { ip: "198.51.100.1", deviceId: "other", shippingAddress: charge.shippingAddress }),
    );
    assert.deepEqual(result.matchedElements, ["accountId", "shippingAddress"]);
    assert.equal(!result.qualifies && result.reason, "no_ip_or_device_match");
  });

  it("accepts device ID plus account ID without an IP match", () => {
    const result = evaluateCandidate(charge, prior("a", 200, { ip: "198.51.100.1" }));
    assert.equal(result.qualifies, true);
    assert.deepEqual(result.matchedElements, ["deviceId", "accountId"]);
  });
});

describe("auditCe3", () => {
  it("is eligible with two qualifying transactions", () => {
    const audit = auditCe3({ dispute: dispute(), charge, priorTransactions: [prior("a", 150), prior("b", 300)] });
    assert.ok(audit.applicable);
    assert.equal(audit.eligible, true);
    assert.equal(audit.qualifyingCount, 2);
  });

  it("is not eligible with only one qualifying transaction", () => {
    const audit = auditCe3({
      dispute: dispute(),
      charge,
      priorTransactions: [prior("a", 150), prior("b", 60), prior("c", 300, { disputed: true })],
    });
    assert.ok(audit.applicable);
    assert.equal(audit.eligible, false);
    assert.equal(audit.qualifyingCount, 1);
    assert.equal(audit.candidates.length, 3);
  });

  it("ignores transactions dated after the disputed one", () => {
    const future: Transaction = { ...prior("f", 0), createdAt: "2026-10-05T00:00:00.000Z" };
    const audit = auditCe3({ dispute: dispute(), charge, priorTransactions: [future] });
    assert.ok(audit.applicable);
    assert.equal(audit.candidates.length, 0);
  });

  it("is not applicable to other reason codes", () => {
    for (const d of [dispute({ reasonCode: "13.1" }), dispute({ network: "mastercard", reasonCode: "4837" })]) {
      const audit = auditCe3({ dispute: d, charge, priorTransactions: [prior("a", 150), prior("b", 300)] });
      assert.equal(audit.applicable, false);
    }
  });
});
