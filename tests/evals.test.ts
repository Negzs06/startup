import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeRuleBased } from "@/lib/analysis/analyze";
import { buildEvidenceIndex } from "@/lib/analysis/evidence";
import { DEMO_CASES, DEMO_NOW, getDemoCase } from "@/lib/demo/cases";
import { CHECK_NAMES, EXPECTATIONS, GATES, type CheckName } from "../evals/cases";
import { detectLanguage, gradeDossier, type Graded } from "../evals/graders";
import { checkGates, compareToBaseline, summarize, type Baseline, type TrialRecord } from "../evals/report";

function reference(caseId: string): { graded: Graded; caseFile: NonNullable<ReturnType<typeof getDemoCase>> } {
  const caseFile = getDemoCase(caseId)!;
  const r = analyzeRuleBased(caseFile, DEMO_NOW, null);
  return { caseFile, graded: { dossier: structuredClone(r.dossier), ce3: r.ce3, guardrails: [...r.guardrails] } };
}

function failedChecks(caseId: string, mutate: (g: Graded, caseFile: ReturnType<typeof reference>["caseFile"]) => void): CheckName[] {
  const { caseFile, graded } = reference(caseId);
  mutate(graded, caseFile);
  const expectation = EXPECTATIONS.find((e) => e.caseId === caseId)!;
  return gradeDossier(caseFile, expectation, graded).filter((g) => !g.passed).map((g) => g.name);
}

describe("expectations", () => {
  it("cover every demo case exactly once", () => {
    assert.deepEqual(EXPECTATIONS.map((e) => e.caseId).sort(), DEMO_CASES.map((c) => c.dispute.id).sort());
  });
  it("has a gate for every check", () => {
    for (const name of CHECK_NAMES) assert.ok(GATES[name] > 0 && GATES[name] <= 1, name);
  });
});

describe("graders accept the rule-based reference dossiers", () => {
  // The rule-based path is correct by construction for these cases, so a grader
  // that rejects it is too strict (or the reference path regressed).
  for (const e of EXPECTATIONS) {
    it(e.caseId, () => {
      const { caseFile, graded } = reference(e.caseId);
      const failed = gradeDossier(caseFile, e, graded).filter((g) => !g.passed);
      assert.deepEqual(failed.map((g) => `${g.name}: ${g.detail}`), []);
    });
  }
});

describe("graders catch defects", () => {
  it("wrong decision", () => {
    assert.ok(failedChecks("CG-1044", (g) => (g.dossier.verdict.decision = "contest")).includes("decision"));
  });

  it("confidence outside the allowed range", () => {
    assert.ok(failedChecks("CG-1045", (g) => (g.dossier.verdict.confidence = "high")).includes("confidence"));
  });

  it("grounding guardrail notes", () => {
    assert.ok(failedChecks("CG-1041", (g) => g.guardrails.push("dropped an unknown reference")).includes("grounded"));
  });

  it("CE 3.0 contradiction in requirements, both directions", () => {
    const eligible = failedChecks("CG-1041", (g) => {
      g.dossier.requirements.push({ requirement: "Compelling Evidence 3.0", status: "not_met", note: "", evidenceRefs: [] });
    });
    assert.ok(eligible.includes("ce3_consistent"));
    const ineligible = failedChecks("CG-1045", (g) => {
      g.dossier.requirements.push({ requirement: "CE 3.0: two prior transactions", status: "met", note: "", evidenceRefs: [] });
    });
    assert.ok(ineligible.includes("ce3_consistent"));
  });

  it("a letter that invokes CE 3.0 when it is not eligible", () => {
    assert.ok(failedChecks("CG-1045", (g) => (g.dossier.coverLetter.english += " This satisfies Visa Compelling Evidence 3.0.")).includes("ce3_consistent"));
  });

  it("letters in the wrong language", () => {
    assert.ok(failedChecks("CG-1041", (g) => (g.dossier.coverLetter.localized = g.dossier.coverLetter.english)).includes("letter_language"));
    assert.ok(failedChecks("CG-1041", (g) => (g.dossier.coverLetter.english = g.dossier.coverLetter.localized)).includes("letter_language"));
  });

  it("internal evidence IDs and raw ISO timestamps in a letter", () => {
    const internal = [...buildEvidenceIndex(getDemoCase("CG-1041")!).values()].find((i) => i.source === "auth0")!.ref;
    assert.ok(failedChecks("CG-1041", (g) => (g.dossier.coverLetter.english += ` See ${internal}.`)).includes("letter_hygiene"));
    assert.ok(failedChecks("CG-1041", (g) => (g.dossier.coverLetter.localized += " 2026-10-02T08:09:00.000Z")).includes("letter_hygiene"));
  });

  it("allows ticket numbers and the charge ID in letters", () => {
    const { caseFile, graded } = reference("CG-1041");
    graded.dossier.coverLetter.english += ` Charge ${caseFile.charge.id}, ticket ${caseFile.tickets[0]?.id}.`;
    const grades = gradeDossier(caseFile, EXPECTATIONS[0]!, graded);
    assert.ok(grades.find((g) => g.name === "letter_hygiene")!.passed);
  });

  it("a letter that names neither the case nor the amount", () => {
    assert.ok(failedChecks("CG-1041", (g) => (g.dossier.coverLetter.english = "We contest this chargeback and request a review of the matter at hand.")).includes("letter_identifies_case"));
  });

  it("letter contradicting the verdict", () => {
    assert.ok(failedChecks("CG-1041", (g) => (g.dossier.coverLetter.english += " We hereby accept the dispute.")).includes("letter_matches_verdict"));
    assert.ok(failedChecks("CG-1044", (g) => (g.dossier.coverLetter.english = "We contest the dispute 1044 for 348 EUR.")).includes("letter_matches_verdict"));
  });

  it("timeline missing the disputed charge", () => {
    assert.ok(failedChecks("CG-1041", (g, c) => (g.dossier.timeline = g.dossier.timeline.filter((t) => t.ref !== c.charge.id))).includes("timeline_cites_charge"));
  });

  it("planted injection not reported", () => {
    assert.ok(failedChecks("CG-1046", (g) => (g.dossier.injectionFlags = [])).includes("injection_flagged"));
  });
});

describe("detectLanguage", () => {
  it("identifies the template letters of every supported language", () => {
    for (const c of DEMO_CASES) {
      const { dossier } = analyzeRuleBased(c, DEMO_NOW, null);
      assert.equal(detectLanguage(dossier.coverLetter.localized), c.dispute.issuer.language, c.dispute.id);
      assert.equal(detectLanguage(dossier.coverLetter.english), "en", c.dispute.id);
    }
  });

  it("returns unknown for empty or digit-only text", () => {
    assert.equal(detectLanguage(""), "unknown");
    assert.equal(detectLanguage("12345 67890"), "unknown");
  });
});

describe("report", () => {
  const grade = (name: CheckName, passed: boolean) => ({ name, passed, detail: passed ? "ok" : "bad" });
  const record = (caseId: string, trial: number, over: Partial<TrialRecord> = {}): TrialRecord => ({
    caseId,
    trial,
    errored: false,
    fallbackReason: null,
    seconds: 1,
    model: "m",
    grades: [grade("decision", true), grade("confidence", true)],
    ...over,
  });

  it("counts only trials that produced a model dossier", () => {
    const s = summarize([record("A", 1), record("A", 2, { grades: [grade("decision", false)] }), record("A", 3, { errored: true, grades: [], fallbackReason: "503" })]);
    assert.equal(s.trials, 3);
    assert.equal(s.valid, 2);
    assert.equal(s.errored, 1);
    assert.deepEqual(s.checks.decision, { passed: 1, total: 2, rate: 0.5 });
    assert.equal(s.checks.grounded.rate, null);
  });

  it("fails a gate below its threshold and ignores checks that never ran", () => {
    const failures = checkGates(summarize([record("A", 1, { grades: [grade("decision", false)] })]));
    assert.equal(failures.length, 1);
    assert.match(failures[0]!, /decision on A: 0%/);
    assert.deepEqual(checkGates(summarize([record("A", 1), record("A", 2)])), []);
  });

  it("does not let a passing case hide a failing one", () => {
    const records = [
      ...[1, 2, 3].map((t) => record("A", t)),
      ...[1, 2, 3].map((t) => record("B", t, { grades: [grade("decision", true), grade("confidence", false)] })),
    ];
    const summary = summarize(records);
    assert.equal(summary.checks.confidence.rate, 0.5);
    const failures = checkGates(summary);
    assert.equal(failures.length, 1);
    assert.match(failures[0]!, /confidence on B: 0%/);
  });

  it("fails when too many trials fell back, or none was graded", () => {
    assert.match(checkGates(summarize([record("A", 1), record("A", 2, { errored: true, grades: [] })])).join(), /fell back/);
    assert.match(checkGates(summarize([record("A", 1, { errored: true, grades: [] })])).join(), /no trial produced/);
  });

  it("flags a drop larger than the tolerance versus the baseline", () => {
    const baseline: Baseline = { createdAt: "2026-10-31T00:00:00Z", model: "m", promptHash: "x", trialsPerCase: 3, summary: summarize([record("A", 1), record("A", 2)]) };
    const worse = summarize([record("A", 1), record("A", 2, { grades: [grade("decision", true), grade("confidence", false)] })]);
    const { regressions, deltas } = compareToBaseline(worse, baseline);
    assert.equal(regressions.length, 1);
    assert.match(regressions[0]!, /confidence: 100% -> 50%/);
    assert.equal(deltas.confidence, -0.5);
    assert.deepEqual(compareToBaseline(baseline.summary, baseline).regressions, []);
  });
});
