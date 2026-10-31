import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BlockedReason, FinishReason } from "@google/genai";
import { AnalysisError, dossierJsonSchema, parseDossierResponse } from "@/lib/analysis/gemini";
import { DossierOutputSchema, type DossierOutput } from "@/lib/analysis/schema";

const valid: DossierOutput = {
  verdict: { decision: "contest", confidence: "high", rationale: "Usage after purchase." },
  reasonCodeSummary: "Summary.",
  requirements: [],
  timeline: [],
  highlightedClauses: [],
  coverLetter: { localized: "Sehr geehrte Damen und Herren", english: "Dear Sir or Madam" },
  evidenceGaps: [],
  injectionFlags: [],
};

type Fake = Parameters<typeof parseDossierResponse>[0];
const reply = (over: Partial<Fake> = {}): Fake => ({
  text: JSON.stringify(valid),
  candidates: [{ finishReason: FinishReason.STOP }],
  modelVersion: "gemini-served-version",
  ...over,
});
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return error instanceof AnalysisError ? error.code : `unexpected: ${String(error)}`;
  }
  return "no error";
};

describe("dossierJsonSchema", () => {
  it("is a plain object schema without the $schema draft marker", () => {
    const schema = dossierJsonSchema() as { type?: string; properties?: Record<string, unknown>; required?: string[]; $schema?: string };
    assert.equal(schema.type, "object");
    assert.equal(schema.$schema, undefined);
    for (const key of Object.keys(DossierOutputSchema.shape)) assert.ok(key in (schema.properties ?? {}), key);
    assert.ok(schema.required?.includes("verdict"));
  });

  it("keeps the verdict enum so the model can only answer contest or accept", () => {
    const schema = dossierJsonSchema() as { properties: { verdict: { properties: { decision: { enum: string[] } } } } };
    assert.deepEqual(schema.properties.verdict.properties.decision.enum, ["contest", "accept"]);
  });
});

describe("parseDossierResponse", () => {
  it("returns the validated dossier and the served model version", () => {
    const { output, model } = parseDossierResponse(reply(), "requested");
    assert.equal(output.verdict.decision, "contest");
    assert.equal(model, "gemini-served-version");
  });

  it("falls back to the requested model name when none is reported", () => {
    assert.equal(parseDossierResponse(reply({ modelVersion: undefined }), "requested").model, "requested");
  });

  it("treats a blocked prompt as a refusal", () => {
    const blocked = reply({ text: undefined, candidates: undefined, promptFeedback: { blockReason: BlockedReason.PROHIBITED_CONTENT } });
    assert.equal(codeOf(() => parseDossierResponse(blocked, "m")), "refusal");
  });

  it("treats safety-type finish reasons as refusals even when partial text exists", () => {
    for (const finishReason of [FinishReason.SAFETY, FinishReason.PROHIBITED_CONTENT, FinishReason.BLOCKLIST, FinishReason.SPII, FinishReason.RECITATION]) {
      assert.equal(codeOf(() => parseDossierResponse(reply({ candidates: [{ finishReason }] }), "m")), "refusal", finishReason);
    }
  });

  it("reports truncation before trying to parse partial JSON", () => {
    const cut = reply({ text: '{"verdict": {', candidates: [{ finishReason: FinishReason.MAX_TOKENS }] });
    assert.equal(codeOf(() => parseDossierResponse(cut, "m")), "truncated");
  });

  it("rejects empty, non-JSON and schema-invalid output", () => {
    assert.equal(codeOf(() => parseDossierResponse(reply({ text: undefined }), "m")), "no_output");
    assert.equal(codeOf(() => parseDossierResponse(reply({ text: "not json" }), "m")), "invalid_output");
    assert.equal(codeOf(() => parseDossierResponse(reply({ text: JSON.stringify({ ...valid, verdict: { decision: "maybe" } }) }), "m")), "invalid_output");
  });
});
