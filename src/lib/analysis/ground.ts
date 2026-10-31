// Grounds the model's structured output in the case file: anything that cannot
// be traced back to a real record is dropped and reported as a guardrail.

import type { CaseFile } from "@/lib/domain/types";
import { buildEvidenceIndex } from "./evidence";
import type { DossierOutput, Dossier, HighlightedClause, TimelineEntry } from "./schema";
import type { CaseSignals } from "./signals";

export function groundDossier(
  output: DossierOutput,
  caseFile: CaseFile,
  signals: CaseSignals,
): { dossier: Dossier; guardrails: string[] } {
  const guardrails: string[] = [];
  const index = buildEvidenceIndex(caseFile);

  const timeline: TimelineEntry[] = [];
  for (const entry of output.timeline) {
    const item = index.get(entry.ref);
    if (!item) {
      guardrails.push(`Dropped timeline entry "${entry.title}": unknown reference ${entry.ref}.`);
      continue;
    }
    timeline.push({ ...entry, at: item.at, source: item.source });
  }
  timeline.sort((a, b) => a.at.localeCompare(b.at));

  // Requirements may also cite Terms of Service clauses: they are real records, just not dated evidence.
  const clauseIds = new Set(caseFile.tos.clauses.map((c) => c.id));
  const citable = (ref: string) => index.has(ref) || clauseIds.has(ref);
  const droppedRefs: string[] = [];
  const requirements = output.requirements.map((r) => {
    const refs = r.evidenceRefs.filter(citable);
    droppedRefs.push(...r.evidenceRefs.filter((ref) => !citable(ref)));
    return { ...r, evidenceRefs: refs };
  });
  if (droppedRefs.length) guardrails.push(`Removed ${droppedRefs.length} requirement citation(s) that did not match any record: ${droppedRefs.map((ref) => `"${ref}"`).join(", ")}.`);

  const clauses: HighlightedClause[] = [];
  for (const c of output.highlightedClauses) {
    const clause = caseFile.tos.clauses.find((x) => x.id === c.clauseId);
    if (!clause) {
      guardrails.push(`Dropped clause ${c.clauseId}: not in Terms of Service v${caseFile.tos.version}.`);
      continue;
    }
    const verbatim = c.highlight && clause.text.includes(c.highlight);
    if (!verbatim) guardrails.push(`Highlight for ${clause.title} was not a verbatim quote; showing the clause without a highlight.`);
    clauses.push({ clauseId: clause.id, title: clause.title, text: clause.text, highlight: verbatim ? c.highlight : null, relevance: c.relevance });
  }

  let verdict = output.verdict;
  if (signals.merchantAtFault && verdict.decision === "contest") {
    verdict = {
      decision: "accept",
      confidence: "high",
      rationale: `Policy override: an unanswered refund request inside the refund window means the merchant is at fault. Model rationale for contesting was: ${verdict.rationale}`,
    };
    guardrails.push("Verdict overridden to accept: deterministic merchant-fault rule fired (unanswered refund request inside the refund window). The cover letter was written for contesting — regenerate or edit before use.");
  }

  const injectionFlags = [...output.injectionFlags];
  for (const attempt of signals.injectionAttempts) {
    if (!injectionFlags.some((f) => f.includes(attempt.ticketId))) {
      injectionFlags.push(`Ticket ${attempt.ticketId} contains text addressed to an automated reviewer: "${attempt.excerpt}".`);
    }
  }

  return {
    dossier: {
      verdict,
      reasonCodeSummary: output.reasonCodeSummary,
      requirements,
      timeline,
      clauses,
      coverLetter: { language: caseFile.dispute.issuer.language, ...output.coverLetter },
      evidenceGaps: output.evidenceGaps,
      injectionFlags,
    },
    guardrails,
  };
}
