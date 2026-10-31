// Repeatable evaluation of the dossier analysis against the demo cases.
//
//   GEMINI_API_KEY=... npm run eval -- [--trials 2] [--concurrency 1] [--cases CG-1044,CG-1045]
//                                      [--model <id>] [--baseline evals/baseline.json]
//                                      [--update-baseline]
//
// It calls the live model, so it spends API quota and is not part of `npm test`.
// It makes cases x trials requests (more if 5xx errors are retried). The Gemini free
// tier has allowed about 20 requests per model per day, so the defaults (12) fit once a day;
// the run stops early if the daily quota runs out.
// Exit code: 0 all gates pass, 1 a gate or the baseline comparison failed, 2 bad usage.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { analyzeCase } from "@/lib/analysis/analyze";
import { dossierJsonSchema, resolveModel } from "@/lib/analysis/gemini";
import { SYSTEM_PROMPT } from "@/lib/analysis/prompt";
import type { AnalysisResult } from "@/lib/analysis/schema";
import { DEMO_NOW, getDemoCase } from "@/lib/demo/cases";
import { EXPECTATIONS } from "./cases";
import { gradeDossier } from "./graders";
import { checkGates, compareToBaseline, formatReport, summarize, type Baseline, type TrialRecord } from "./report";

const DEFAULT_BASELINE = "evals/baseline.json";

const { values } = parseArgs({
  options: {
    trials: { type: "string", default: "2" },
    concurrency: { type: "string", default: "1" },
    cases: { type: "string" },
    model: { type: "string" },
    baseline: { type: "string" },
    "update-baseline": { type: "boolean", default: false },
  },
});

function usage(message: string): never {
  console.error(`eval: ${message}`);
  process.exit(2);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) usage("GEMINI_API_KEY is not set; this evaluation calls the live model.");

const trials = Number(values.trials);
const concurrency = Number(values.concurrency);
if (!Number.isInteger(trials) || trials < 1) usage("--trials must be a positive integer");
if (!Number.isInteger(concurrency) || concurrency < 1) usage("--concurrency must be a positive integer");
if (values.model) process.env.GEMINI_MODEL = values.model;

const wanted = values.cases?.split(",").map((s) => s.trim());
const expectations = EXPECTATIONS.filter((e) => !wanted || wanted.includes(e.caseId));
if (wanted) for (const id of wanted) if (!EXPECTATIONS.some((e) => e.caseId === id)) usage(`unknown case ${id}`);
if (expectations.length === 0) usage("no cases selected");

const promptHash = createHash("sha256").update(SYSTEM_PROMPT).update(JSON.stringify(dossierJsonSchema())).digest("hex").slice(0, 12);

interface Job {
  caseId: string;
  trial: number;
}
const jobs: Job[] = expectations.flatMap((e) => Array.from({ length: trials }, (_, i) => ({ caseId: e.caseId, trial: i + 1 })));
const records: TrialRecord[] = [];
let quotaExhausted = false;
const results: Array<{ caseId: string; trial: number; result: AnalysisResult }> = [];

async function runJob({ caseId, trial }: Job): Promise<void> {
  if (quotaExhausted) return;
  const caseFile = getDemoCase(caseId)!;
  const expectation = expectations.find((e) => e.caseId === caseId)!;
  const started = Date.now();
  const result = await analyzeCase(caseFile, { generatedAt: DEMO_NOW, apiKey });
  const seconds = Math.round((Date.now() - started) / 1000);
  const errored = result.source !== "ai";
  const grades = errored ? [] : gradeDossier(caseFile, expectation, result);
  records.push({ caseId, trial, errored, fallbackReason: result.fallbackReason, seconds, model: result.model, grades });
  results.push({ caseId, trial, result });
  if (errored && /per day/i.test(result.fallbackReason ?? "")) quotaExhausted = true;
  const failed = grades.filter((g) => !g.passed).map((g) => g.name);
  console.log(`${caseId} #${trial}  ${seconds}s  ${errored ? "NO MODEL DOSSIER" : failed.length ? `failed: ${failed.join(", ")}` : "all checks passed"}`);
}

async function main(): Promise<void> {
  console.log(`Model ${resolveModel()} · prompt ${promptHash} · ${expectations.length} case(s) x ${trials} trial(s) = up to ${jobs.length} requests\n`);
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) await runJob(job);
    }),
  );
  records.sort((a, b) => a.caseId.localeCompare(b.caseId) || a.trial - b.trial);

  const summary = summarize(records);
  const baselinePath = values.baseline ?? (existsSync(DEFAULT_BASELINE) && !values["update-baseline"] ? DEFAULT_BASELINE : null);
  const baseline: Baseline | null = baselinePath ? (JSON.parse(readFileSync(baselinePath, "utf8")) as Baseline) : null;
  const { regressions, deltas } = baseline ? compareToBaseline(summary, baseline) : { regressions: [], deltas: {} };

  console.log(`\n${formatReport(records, summary, baseline, deltas)}\n`);
  if (baseline) {
    const changes = [baseline.model !== (records.find((r) => r.model)?.model ?? null) && "model", baseline.promptHash !== promptHash && "prompt/schema"].filter(Boolean);
    console.log(`Baseline ${baselinePath} (${baseline.createdAt.slice(0, 10)}, model ${baseline.model ?? "n/a"}, prompt ${baseline.promptHash})${changes.length ? ` - changed since: ${changes.join(", ")}` : ""}`);
  }

  mkdirSync("evals/results", { recursive: true });
  const out = `evals/results/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(out, JSON.stringify({ model: resolveModel(), promptHash, trials, summary, records, results }, null, 2));
  console.log(`Full results (dossiers included): ${out}`);

  const notRun = jobs.length - records.length;
  const failures = [
    ...(notRun > 0 ? [`stopped early: the daily quota ran out and ${notRun} of ${jobs.length} trials were not run`] : []),
    ...checkGates(summary),
    ...regressions.map((r) => `regression - ${r}`),
  ];
  if (values["update-baseline"]) {
    if (failures.length) {
      console.error("\nBaseline not updated: the run has failures.");
    } else {
      const next: Baseline = { createdAt: new Date().toISOString(), model: records.find((r) => r.model)?.model ?? null, promptHash, trialsPerCase: trials, summary };
      writeFileSync(DEFAULT_BASELINE, `${JSON.stringify(next, null, 2)}\n`);
      console.log(`Baseline written to ${DEFAULT_BASELINE}`);
    }
  }

  if (failures.length) {
    console.error(`\nFAILED\n${failures.map((f) => `  - ${f}`).join("\n")}`);
    process.exit(1);
  }
  console.log("\nPASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
