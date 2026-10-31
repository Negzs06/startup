import { CHECK_NAMES, GATES, MAX_ERRORED_SHARE, REGRESSION_DROP, type CheckName } from "./cases";
import type { Grade } from "./graders";

export interface TrialRecord {
  caseId: string;
  trial: number;
  /** The model call did not produce a dossier (API error, refusal, bad output): the rule-based fallback ran. */
  errored: boolean;
  fallbackReason: string | null;
  seconds: number;
  model: string | null;
  grades: Grade[];
}

export interface Rate {
  passed: number;
  total: number;
  rate: number | null;
}

export interface Summary {
  trials: number;
  valid: number;
  errored: number;
  checks: Record<CheckName, Rate>;
  byCase: Record<string, Partial<Record<CheckName, Rate>>>;
}

export interface Baseline {
  createdAt: string;
  model: string | null;
  promptHash: string;
  trialsPerCase: number;
  summary: Summary;
}

function rate(passed: number, total: number): Rate {
  return { passed, total, rate: total ? passed / total : null };
}

export function summarize(records: TrialRecord[]): Summary {
  const valid = records.filter((r) => !r.errored);
  const checks = Object.fromEntries(
    CHECK_NAMES.map((name) => {
      const grades = valid.flatMap((r) => r.grades.filter((g) => g.name === name));
      return [name, rate(grades.filter((g) => g.passed).length, grades.length)];
    }),
  ) as Record<CheckName, Rate>;

  const byCase: Summary["byCase"] = {};
  for (const caseId of new Set(records.map((r) => r.caseId))) {
    byCase[caseId] = {};
    for (const name of CHECK_NAMES) {
      const grades = valid.filter((r) => r.caseId === caseId).flatMap((r) => r.grades.filter((g) => g.name === name));
      if (grades.length) byCase[caseId][name] = rate(grades.filter((g) => g.passed).length, grades.length);
    }
  }
  return { trials: records.length, valid: valid.length, errored: records.length - valid.length, checks, byCase };
}

export function checkGates(summary: Summary): string[] {
  const failures: string[] = [];
  if (summary.valid === 0) failures.push("no trial produced a model dossier, so nothing was evaluated");
  if (summary.trials > 0 && summary.errored / summary.trials > MAX_ERRORED_SHARE) {
    failures.push(`${summary.errored} of ${summary.trials} trials fell back to the rule-based dossier (limit ${Math.round(MAX_ERRORED_SHARE * 100)}%)`);
  }
  // Gates apply per case: an average would hide a case that always fails (for
  // example over-confidence on the one case built to catch it).
  for (const [caseId, checks] of Object.entries(summary.byCase)) {
    for (const name of CHECK_NAMES) {
      const r = checks[name];
      if (r && r.rate !== null && r.rate < GATES[name]) {
        failures.push(`${name} on ${caseId}: ${pct(r.rate)} (${r.passed}/${r.total}) is below the ${pct(GATES[name])} gate`);
      }
    }
  }
  return failures;
}

export function compareToBaseline(summary: Summary, baseline: Baseline): { regressions: string[]; deltas: Partial<Record<CheckName, number>> } {
  const regressions: string[] = [];
  const deltas: Partial<Record<CheckName, number>> = {};
  for (const name of CHECK_NAMES) {
    const now = summary.checks[name].rate;
    const before = baseline.summary.checks[name]?.rate ?? null;
    if (now === null || before === null) continue;
    deltas[name] = now - before;
    if (before - now > REGRESSION_DROP) {
      regressions.push(`${name}: ${pct(before)} -> ${pct(now)} versus the baseline`);
    }
  }
  return { regressions, deltas };
}

export function pct(value: number | null): string {
  return value === null ? "n/a" : `${Math.round(value * 100)}%`;
}

export function formatReport(records: TrialRecord[], summary: Summary, baseline: Baseline | null, deltas: Partial<Record<CheckName, number>>): string {
  const lines: string[] = [];
  const cases = Object.keys(summary.byCase);
  lines.push(`Trials: ${summary.trials} (${summary.valid} graded, ${summary.errored} fell back to rule-based)`, "");

  const nameWidth = Math.max(...CHECK_NAMES.map((n) => n.length));
  lines.push(`${"check".padEnd(nameWidth)}  ${"all".padStart(9)}  gate  ${baseline ? "vs baseline  " : ""}${cases.join("  ")}`);
  for (const name of CHECK_NAMES) {
    const r = summary.checks[name];
    const all = r.total ? `${pct(r.rate)} ${r.passed}/${r.total}`.padStart(9) : "n/a".padStart(9);
    const delta = deltas[name];
    const deltaCell = baseline ? `${delta === undefined ? "n/a" : `${delta >= 0 ? "+" : ""}${Math.round(delta * 100)} pts`}`.padEnd(11) + "  " : "";
    const perCase = cases.map((c) => (summary.byCase[c]?.[name] ? pct(summary.byCase[c][name]!.rate).padStart(c.length) : "-".padStart(c.length))).join("  ");
    lines.push(`${name.padEnd(nameWidth)}  ${all}  ${pct(GATES[name]).padStart(4)}  ${deltaCell}${perCase}`);
  }

  const failed = records.filter((r) => !r.errored).flatMap((r) => r.grades.filter((g) => !g.passed).map((g) => `  ${r.caseId} #${r.trial} ${g.name}: ${g.detail}`));
  if (failed.length) lines.push("", "Failed checks:", ...failed);
  const errored = records.filter((r) => r.errored).map((r) => `  ${r.caseId} #${r.trial}: ${r.fallbackReason ?? "unknown"}`.slice(0, 220));
  if (errored.length) lines.push("", "Trials without a model dossier:", ...errored);
  return lines.join("\n");
}
