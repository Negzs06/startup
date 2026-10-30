import { test } from "node:test";
import assert from "node:assert/strict";
import { auditCe3 } from "../src/lib/ce3";
import { DISPUTES, getDispute } from "../src/lib/disputes";
import { buildFixtureDossier } from "../src/lib/fixtures";

const visa104 = getDispute("dp_1QvK9aLm")!;

test("qualifies two prior transactions with IP + device match in the 120-365 day window", () => {
  const result = auditCe3(visa104);
  assert.equal(result.applicable, true);
  assert.equal(result.eligible, true);
  assert.deepEqual(result.qualifying.map((q) => q.transaction.id).sort(), ["ch_1Mar", "ch_2Jun"]);
  for (const q of result.qualifying) {
    assert.ok(q.ageDays >= 120 && q.ageDays <= 365);
    assert.ok(q.matched.includes("ip") && q.matched.includes("deviceId"));
  }
});

test("rejects too-recent and mismatched prior transactions with a reason", () => {
  const { rejected } = auditCe3(visa104);
  const byId = Object.fromEntries(rejected.map((r) => [r.transaction.id, r.reason]));
  assert.match(byId["ch_4Sep"], /minimum 120/);
  assert.match(byId["ch_3Apr"], /needs IP or device ID/);
});

test("is not eligible with a single qualifying transaction", () => {
  const result = auditCe3({ ...visa104, history: visa104.history.filter((h) => h.id !== "ch_2Jun") });
  assert.equal(result.eligible, false);
  assert.equal(result.qualifying.length, 1);
});

test("ignores disputed prior transactions", () => {
  const history = visa104.history.map((h) => (h.id === "ch_1Mar" ? { ...h, disputed: true } : h));
  const result = auditCe3({ ...visa104, history });
  assert.equal(result.eligible, false);
});

test("treats the 120 and 365 day boundaries as inclusive", () => {
  const disputed = { ...visa104.transaction, date: "2026-10-26T00:00:00Z" };
  const at = (days: number, id: string) => ({
    ...visa104.history[0],
    id,
    date: new Date(Date.parse(disputed.date) - days * 86_400_000).toISOString(),
  });
  const result = auditCe3({ ...visa104, transaction: disputed, history: [at(120, "a"), at(365, "b"), at(366, "c")] });
  assert.deepEqual(result.qualifying.map((q) => q.transaction.id), ["a", "b"]);
});

test("is not applicable outside Visa 10.4", () => {
  const mc = getDispute("dp_1QyF2hRs")!;
  assert.equal(auditCe3(mc).applicable, false);
});

test("fixture dossier contests the CE 3.0 case in German and accepts the unrefunded one", () => {
  const strong = buildFixtureDossier(visa104, auditCe3(visa104));
  assert.equal(strong.verdict, "contest");
  assert.equal(strong.coverLetter.language, "de");
  assert.match(strong.coverLetter.localized, /Sehr geehrtes/);

  const jp = getDispute("dp_1QxD7yWe")!;
  const weak = buildFixtureDossier(jp, auditCe3(jp));
  assert.equal(weak.verdict, "accept");
  assert.equal(weak.coverLetter.localized, "");
});

test("every open demo dispute produces a chronological timeline", () => {
  for (const d of DISPUTES.filter((x) => x.status === "new")) {
    const { timeline } = buildFixtureDossier(d, auditCe3(d));
    const sorted = [...timeline].sort((a, b) => a.at.localeCompare(b.at));
    assert.deepEqual(timeline, sorted);
  }
});
