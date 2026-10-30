import type { CaseFile, EvidenceSource } from "@/lib/domain/types";

export interface EvidenceItem {
  ref: string;
  at: string;
  source: EvidenceSource;
  label: string;
}

export const TOS_ACCEPTANCE_REF = "tos-acceptance";

/**
 * Every record the dossier may cite, keyed by a stable ID. Claude must cite
 * these IDs; timestamps and sources always come from here, never from the model.
 */
export function buildEvidenceIndex(caseFile: CaseFile): Map<string, EvidenceItem> {
  const items: EvidenceItem[] = [
    { ref: caseFile.charge.id, at: caseFile.charge.createdAt, source: "stripe", label: `Disputed charge: ${caseFile.charge.description}` },
    ...caseFile.priorTransactions.map((t) => ({
      ref: t.id,
      at: t.createdAt,
      source: "stripe" as const,
      label: `Prior charge: ${t.description}${t.disputed ? " (disputed)" : ""}`,
    })),
    ...caseFile.sessions.map((s) => ({ ref: s.id, at: s.at, source: s.source, label: s.detail })),
    ...caseFile.tickets.map((t) => ({ ref: t.id, at: t.createdAt, source: "zendesk" as const, label: `Support ticket: ${t.subject}` })),
    { ref: TOS_ACCEPTANCE_REF, at: caseFile.tos.acceptedAt, source: "tos", label: `Accepted Terms of Service v${caseFile.tos.version}` },
  ];
  return new Map(items.map((item) => [item.ref, item]));
}
