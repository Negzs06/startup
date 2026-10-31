import { auditCe3 } from "@/lib/ce3/audit";
import type { CaseFile } from "@/lib/domain/types";
import { AnalysisError, requestDossier } from "./gemini";
import { groundDossier } from "./ground";
import { buildUserPrompt } from "./prompt";
import { buildRuleBasedDossier } from "./rule-based";
import type { AnalysisResult } from "./schema";
import { computeSignals } from "./signals";

export type DossierRequester = typeof requestDossier;

export interface AnalyzeOptions {
  /** Skip the model even when a key is configured. */
  ruleBasedOnly?: boolean;
  /** Timestamp to stamp on the result; pass a fixed value for prerendered pages. */
  generatedAt: string;
  apiKey?: string | undefined;
  /** Injectable for tests. */
  requester?: DossierRequester;
}

export function analyzeRuleBased(caseFile: CaseFile, generatedAt: string, fallbackReason: string | null): AnalysisResult {
  const ce3 = auditCe3(caseFile);
  const signals = computeSignals(caseFile);
  return {
    caseId: caseFile.dispute.id,
    source: "rule-based",
    model: null,
    generatedAt,
    fallbackReason,
    ce3,
    signals,
    dossier: buildRuleBasedDossier(caseFile, ce3, signals),
    guardrails: [],
  };
}

export async function analyzeCase(caseFile: CaseFile, options: AnalyzeOptions): Promise<AnalysisResult> {
  if (options.ruleBasedOnly) return analyzeRuleBased(caseFile, options.generatedAt, "Rule-based analysis requested.");
  if (!options.apiKey) return analyzeRuleBased(caseFile, options.generatedAt, "GEMINI_API_KEY is not configured.");

  const ce3 = auditCe3(caseFile);
  const signals = computeSignals(caseFile);
  try {
    const { output, model } = await (options.requester ?? requestDossier)(buildUserPrompt(caseFile, ce3, signals), { apiKey: options.apiKey });
    const { dossier, guardrails } = groundDossier(output, caseFile, signals);
    return { caseId: caseFile.dispute.id, source: "ai", model, generatedAt: options.generatedAt, fallbackReason: null, ce3, signals, dossier, guardrails };
  } catch (error) {
    const reason = error instanceof AnalysisError ? error.message : "Unexpected error during model analysis.";
    if (!(error instanceof AnalysisError)) console.error("[chargeguard] analysis failed", error);
    return analyzeRuleBased(caseFile, options.generatedAt, `Model analysis failed — ${reason}`);
  }
}
