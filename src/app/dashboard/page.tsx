"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  FlaskConical,
  GitBranch,
  GitPullRequest,
  Info,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  TestTube2,
  Timer,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Tipos e dados da simulação                                                */
/* -------------------------------------------------------------------------- */

type PipelineStatus = "idle" | "running" | "completed";
type LogLevel = "cmd" | "info" | "success" | "warn" | "error";
type ResultTab = "diff" | "tests" | "report";

interface LogEvent {
  t: number;
  agent: number;
  level: LogLevel;
  msg: string;
}

interface AgentDef {
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

const AGENTS: AgentDef[] = [
  { title: "Mapeamento de AST & Grafo de Dependências", subtitle: "Parser + análise estática do repositório", icon: Search },
  { title: "Geração da Suíte de Caracterização", subtitle: "Trava o comportamento original com Vitest", icon: FlaskConical },
  { title: "Refatoração Semântica com Claude 3.5 Sonnet", subtitle: "Callbacks → async/await, var → const, tipos estritos", icon: Zap },
  { title: "Self-Healing Loop (Build Sandbox & Test Runner)", subtitle: "Compila, executa testes e corrige falhas", icon: RefreshCw },
  { title: "Abertura do Pull Request & Relatório", subtitle: "Branch, commit e relatório de auditoria", icon: GitPullRequest },
];

const LOG_SCRIPT: LogEvent[] = [
  { t: 200, agent: 0, level: "cmd", msg: "$ refactorpulse scan github.com/enterprise-org/core-billing-service" },
  { t: 600, agent: 0, level: "info", msg: "Cloning repository… 412 files (.js, .json) indexed" },
  { t: 1000, agent: 0, level: "info", msg: "AST parsed: 42 functions found across 28 modules" },
  { t: 1400, agent: 0, level: "warn", msg: "3 circular dependencies detected in /services/invoice" },
  { t: 1800, agent: 0, level: "success", msg: "Dependency graph built: 7 public entry points, 0 dead exports" },

  { t: 2100, agent: 1, level: "cmd", msg: "$ claude run --tool generate_characterization_tests" },
  { t: 2500, agent: 1, level: "info", msg: "Replaying 184 recorded production calls against legacy code…" },
  { t: 2900, agent: 1, level: "info", msg: "Snapshotting observable behavior of getInvoiceTotal() and applyTax()" },
  { t: 3400, agent: 1, level: "success", msg: "Characterization suite generated: 18 tests (Vitest)" },
  { t: 3800, agent: 1, level: "success", msg: "Baseline run on legacy code: 18/18 passing — behavior locked" },

  { t: 4100, agent: 2, level: "cmd", msg: "$ claude run --tool refactor_module --strict" },
  { t: 4500, agent: 2, level: "info", msg: "Isolating InvoiceService into a pure module (no side effects)" },
  { t: 4900, agent: 2, level: "info", msg: "Rewriting nested callbacks as async/await with typed Promises" },
  { t: 5300, agent: 2, level: "info", msg: "Replacing string-concatenated SQL with parameterized query" },
  { t: 5800, agent: 2, level: "success", msg: "14 files refactored • 3 new isolated modules • 0 implicit any" },

  { t: 6100, agent: 3, level: "cmd", msg: "$ run_test_suite --sandbox ephemeral --target ./dist" },
  { t: 6500, agent: 3, level: "info", msg: "tsc --strict … compiling" },
  { t: 6900, agent: 3, level: "error", msg: "Running Vitest: 3 failing assertions (tax rounding in applyTax)" },
  { t: 7300, agent: 3, level: "warn", msg: "Self-healing triggered (1/3): Claude rewriting async handler" },
  { t: 7700, agent: 3, level: "info", msg: "Patch applied: fixed-point decimal math via big.js, round(2)" },
  { t: 8100, agent: 3, level: "success", msg: "All 18 tests passing with 0 regressions" },

  { t: 8400, agent: 4, level: "cmd", msg: "$ create_github_pr --branch refactor/invoice-service-ts" },
  { t: 8800, agent: 4, level: "info", msg: "Generating architectural audit report (markdown)…" },
  { t: 9200, agent: 4, level: "success", msg: "Pull Request #142 opened on enterprise-org/core-billing-service" },
  { t: 9500, agent: 4, level: "success", msg: "Pipeline complete — 0% regression, 96.8% coverage" },
];

const FINISH_AT = 9800;

interface DiffFile {
  path: string;
  oldCode: string;
  newCode: string;
}

const DIFF_FILES: DiffFile[] = [
  {
    path: "services/invoice/InvoiceService.js → .ts",
    oldCode: `var db = require('../db');
var TaxEngine = require('./TaxEngine');

function getInvoiceTotal(invoiceId, callback) {
  db.query('SELECT * FROM items WHERE invoice_id = ' + invoiceId, function (err, items) {
    if (err) return callback(err);
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      total += items[i].price * items[i].qty;
    }
    TaxEngine.apply(total, function (err2, taxed) {
      if (err2) return callback(err2);
      callback(null, taxed);
    });
  });
}

module.exports = { getInvoiceTotal: getInvoiceTotal };`,
    newCode: `import { db } from "../db";
import { applyTax } from "./tax-engine";

interface InvoiceItem {
  price: number;
  qty: number;
}

export async function getInvoiceTotal(invoiceId: number): Promise<number> {
  const items = await db.query<InvoiceItem>(
    "SELECT * FROM items WHERE invoice_id = $1",
    [invoiceId],
  );

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return applyTax(subtotal);
}`,
  },
  {
    path: "services/billing/TaxEngine.js → tax-engine/index.ts",
    oldCode: `exports.apply = function (amount, cb) {
  var rate = process.env.TAX_RATE || '0.18';
  try {
    cb(null, amount + amount * parseFloat(rate));
  } catch (e) {
    cb(e);
  }
};`,
    newCode: `import Big from "big.js";

const DEFAULT_RATE = "0.18";

export function applyTax(
  amount: number,
  rate: string = process.env.TAX_RATE ?? DEFAULT_RATE,
): number {
  const base = new Big(amount);
  return base.plus(base.times(rate)).round(2).toNumber();
}`,
  },
];

const TEST_NAMES: string[] = [
  "getInvoiceTotal sums price × qty for every item",
  "getInvoiceTotal returns 0 for an invoice without items",
  "getInvoiceTotal propagates database errors",
  "getInvoiceTotal handles a single item invoice",
  "getInvoiceTotal handles 1,000 items without precision drift",
  "getInvoiceTotal applies tax after the subtotal",
  "getInvoiceTotal rejects non-numeric invoice ids",
  "applyTax uses TAX_RATE from the environment",
  "applyTax falls back to the default 18% rate",
  "applyTax rounds half up to 2 decimals",
  "applyTax keeps 0 as 0",
  "applyTax handles amounts with 3+ decimals",
  "applyTax matches legacy output for 184 recorded inputs",
  "applyTax never returns NaN",
  "applyTax is deterministic across repeated calls",
  "applyTax supports string rates such as '0.075'",
  "module exports match the legacy public API",
  "legacy and refactored totals are identical (differential)",
];

const TEST_CODE = `import { describe, it, expect, vi } from "vitest";
import { getInvoiceTotal } from "./InvoiceService";
import { applyTax } from "../billing/tax-engine";
import { db } from "../db";

vi.mock("../db");

describe("getInvoiceTotal — characterization", () => {
  it("sums price × qty for every item", async () => {
    vi.mocked(db.query).mockResolvedValue([
      { price: 10, qty: 2 },
      { price: 5.5, qty: 3 },
    ]);
    // Snapshot captured from the legacy implementation
    expect(await getInvoiceTotal(1)).toBe(43.07);
  });

  it("propagates database errors", async () => {
    vi.mocked(db.query).mockRejectedValue(new Error("connection lost"));
    await expect(getInvoiceTotal(1)).rejects.toThrow("connection lost");
  });
});

describe("applyTax — characterization", () => {
  it("rounds half up to 2 decimals", () => {
    expect(applyTax(10.005, "0.18")).toBe(11.81);
  });

  it("matches legacy output for recorded production inputs", () => {
    for (const [amount, expected] of RECORDED_CALLS) {
      expect(applyTax(amount)).toBe(expected);
    }
  });
});`;

const AUDIT_DECISIONS: { tag: string; title: string; detail: string }[] = [
  {
    tag: "Arquitetura",
    title: "TaxEngine extraído como módulo puro",
    detail: "A regra de imposto estava acoplada ao acesso a dados. Agora é uma função determinística, sem I/O, testável de forma isolada.",
  },
  {
    tag: "Segurança",
    title: "SQL parametrizado",
    detail: "A concatenação de strings em db.query permitia SQL injection via invoiceId. Substituída por query parametrizada com tipo numérico.",
  },
  {
    tag: "Precisão",
    title: "Aritmética decimal com big.js",
    detail: "O self-healing detectou 3 falhas de arredondamento de ponto flutuante e corrigiu usando decimal de precisão fixa.",
  },
  {
    tag: "Dependências",
    title: "Remoção de callbacks aninhados",
    detail: "Todo o fluxo assíncrono usa async/await com Promises tipadas, eliminando 'callback hell' e erros engolidos.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Utilitários                                                               */
/* -------------------------------------------------------------------------- */

type DiffRow = {
  kind: "same" | "added" | "removed";
  oldNo: number | null;
  newNo: number | null;
  oldText: string | null;
  newText: string | null;
};

function diffLines(oldCode: string, newCode: string): DiffRow[] {
  const a = oldCode.split("\n");
  const b = newCode.split("\n");
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  let oldNo = 1;
  let newNo = 1;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      rows.push({ kind: "same", oldNo: oldNo++, newNo: newNo++, oldText: a[i], newText: b[j] });
      i++;
      j++;
    } else if (j >= b.length || (i < a.length && lcs[i + 1][j] >= lcs[i][j + 1])) {
      rows.push({ kind: "removed", oldNo: oldNo++, newNo: null, oldText: a[i], newText: null });
      i++;
    } else {
      rows.push({ kind: "added", oldNo: null, newNo: newNo++, oldText: null, newText: b[j] });
      j++;
    }
  }
  return rows;
}

function formatClock(ms: number): string {
  return `${(ms / 1000).toFixed(1).padStart(4, "0")}s`;
}

const LEVEL_STYLE: Record<LogLevel, string> = {
  cmd: "text-sky-300",
  info: "text-neutral-400",
  success: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

const LEVEL_ICON: Record<LogLevel, LucideIcon | null> = {
  cmd: null,
  info: Info,
  success: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
};

/* -------------------------------------------------------------------------- */
/*  Componentes de apresentação                                               */
/* -------------------------------------------------------------------------- */

function AgentCard({
  agent,
  index,
  state,
}: {
  agent: AgentDef;
  index: number;
  state: "waiting" | "running" | "done";
}) {
  const Icon = agent.icon;
  return (
    <div
      className={[
        "flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-all duration-300",
        state === "waiting" && "border-white/[0.06] bg-white/[0.02] opacity-60",
        state === "running" &&
          "border-sky-400/40 bg-sky-400/[0.06] shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_0_30px_-10px_rgba(56,189,248,0.4)]",
        state === "done" && "border-emerald-400/25 bg-emerald-400/[0.04]",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
          state === "waiting" && "border-white/10 text-neutral-500",
          state === "running" && "border-sky-400/40 text-sky-300",
          state === "done" && "border-emerald-400/30 text-emerald-400",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {state === "running" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "done" ? (
          <Check className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-neutral-100">
            <span className="mr-1.5 font-mono text-xs text-neutral-500">0{index + 1}</span>
            {agent.title}
          </p>
          <span
            className={[
              "shrink-0 text-[11px] font-medium uppercase tracking-wider",
              state === "waiting" && "text-neutral-500",
              state === "running" && "text-sky-300",
              state === "done" && "text-emerald-400",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {state === "waiting" ? "Aguardando" : state === "running" ? "Em execução" : "Concluído"}
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">{agent.subtitle}</p>
      </div>
    </div>
  );
}

function TerminalWindow({ logs, running }: { logs: LogEvent[]; running: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-black">
      <div className="flex items-center gap-2 border-b border-white/[0.08] bg-neutral-950 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
        <Terminal className="ml-3 h-3.5 w-3.5 text-neutral-500" />
        <span className="font-mono text-xs text-neutral-500">agent-feed — core-billing-service</span>
        {running && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            LIVE
          </span>
        )}
      </div>

      <div ref={scrollRef} className="max-h-[520px] flex-1 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-6">
        {logs.length === 0 && (
          <p className="text-neutral-600">
            <span className="text-emerald-500">➜</span> Aguardando início do pipeline
            <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-neutral-500" />
          </p>
        )}
        {logs.map((log, idx) => {
          const Icon = LEVEL_ICON[log.level];
          return (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="shrink-0 text-neutral-600">[{formatClock(log.t)}]</span>
              {Icon ? (
                <Icon className={`mt-1.5 h-3.5 w-3.5 shrink-0 ${LEVEL_STYLE[log.level]}`} />
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              <span className={`min-w-0 break-words ${LEVEL_STYLE[log.level]}`}>{log.msg}</span>
            </div>
          );
        })}
        {running && (
          <div className="mt-1 flex items-center gap-2 text-neutral-600">
            <span className="w-[calc(3.5rem+1rem)]" />
            <span className="inline-block h-4 w-2 animate-pulse bg-neutral-500" />
          </div>
        )}
      </div>
    </div>
  );
}

function DiffViewer() {
  const [active, setActive] = useState(0);
  const file = DIFF_FILES[active];
  const rows = useMemo(() => diffLines(file.oldCode, file.newCode), [file]);
  const added = rows.filter((r) => r.kind === "added").length;
  const removed = rows.filter((r) => r.kind === "removed").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {DIFF_FILES.map((f, i) => (
          <button
            key={f.path}
            onClick={() => setActive(i)}
            className={[
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors",
              i === active
                ? "border-white/20 bg-white/[0.08] text-neutral-100"
                : "border-white/[0.06] text-neutral-500 hover:text-neutral-300",
            ].join(" ")}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            {f.path}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-3 self-center font-mono text-xs">
          <span className="text-emerald-400">+{added}</span>
          <span className="text-red-400">−{removed}</span>
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black">
        <div className="grid grid-cols-2 border-b border-white/[0.08] bg-neutral-950 text-xs font-medium">
          <div className="border-r border-white/[0.08] px-4 py-2 text-red-300/80">
            Antes · JavaScript legado (ES5 + callbacks)
          </div>
          <div className="px-4 py-2 text-emerald-300/80">Depois · TypeScript estrito (async/await)</div>
        </div>
        <div className="max-h-[480px] overflow-auto font-mono text-[12.5px] leading-6">
          <div className="min-w-[720px]">
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-2">
                <div
                  className={[
                    "flex border-r border-white/[0.06] px-3",
                    row.kind === "removed" && "bg-red-500/[0.12]",
                    row.oldText === null && "bg-white/[0.015]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="w-8 shrink-0 select-none pr-3 text-right text-neutral-600">
                    {row.oldNo ?? ""}
                  </span>
                  <span className={`whitespace-pre-wrap break-all ${row.kind === "removed" ? "text-red-300" : "text-neutral-400"}`}>
                    {row.kind === "removed" ? "− " : "  "}
                    {row.oldText ?? ""}
                  </span>
                </div>
                <div
                  className={[
                    "flex px-3",
                    row.kind === "added" && "bg-emerald-500/[0.12]",
                    row.newText === null && "bg-white/[0.015]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="w-8 shrink-0 select-none pr-3 text-right text-neutral-600">
                    {row.newNo ?? ""}
                  </span>
                  <span className={`whitespace-pre-wrap break-all ${row.kind === "added" ? "text-emerald-300" : "text-neutral-400"}`}>
                    {row.kind === "added" ? "+ " : "  "}
                    {row.newText ?? ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TestsView() {
  const lines = TEST_CODE.split("\n");
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black lg:col-span-3">
        <div className="flex items-center gap-2 border-b border-white/[0.08] bg-neutral-950 px-4 py-2 font-mono text-xs text-neutral-500">
          <FileCode2 className="h-3.5 w-3.5" />
          services/invoice/InvoiceService.characterization.test.ts
        </div>
        <div className="max-h-[480px] overflow-auto py-2 font-mono text-[12.5px] leading-6">
          {lines.map((line, i) => (
            <div key={i} className="flex px-3">
              <span className="w-8 shrink-0 select-none pr-3 text-right text-neutral-600">{i + 1}</span>
              <span className="whitespace-pre text-neutral-300">{line}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] lg:col-span-2">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5">
          <span className="text-sm font-medium text-neutral-200">Resultado do Vitest</span>
          <span className="font-mono text-xs text-emerald-400">18 / 18 passing</span>
        </div>
        <ul className="max-h-[440px] divide-y divide-white/[0.05] overflow-y-auto">
          {TEST_NAMES.map((name) => (
            <li key={name} className="flex items-start gap-2.5 px-4 py-2 text-xs text-neutral-300">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              {name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
        <Icon className="h-4 w-4 text-emerald-400" />
        {label}
      </div>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-neutral-50">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

function ReportView({ onOpenPr, prNote }: { onOpenPr: () => void; prNote: boolean }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={ShieldCheck} label="Regressões detectadas" value="0" hint="18/18 testes de caracterização passando" />
        <StatCard icon={TestTube2} label="Cobertura criada" value="96.8%" hint="+ 18 testes gerados pelo Claude" />
        <StatCard icon={Timer} label="Tempo de pipeline" value="18.4s" hint="Do clone ao Pull Request" />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-neutral-100">Relatório de Auditoria Arquitetural</h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          O serviço <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-neutral-200">core-billing-service</code>{" "}
          foi migrado de JavaScript ES5 para TypeScript estrito. 14 arquivos foram refatorados em 3 módulos isolados,
          sem alteração de comportamento observável.
        </p>
        <div className="mt-4 divide-y divide-white/[0.06]">
          {AUDIT_DECISIONS.map((d) => (
            <div key={d.title} className="flex gap-3 py-3">
              <span className="mt-0.5 h-5 shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-1.5 text-[11px] leading-5 text-neutral-300">
                {d.tag}
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-100">{d.title}</p>
                <p className="mt-0.5 text-sm text-neutral-500">{d.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onOpenPr}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
        >
          <GitPullRequest className="h-4 w-4" />
          Ver Pull Request #142 no GitHub
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        {prNote && (
          <span className="text-xs text-neutral-500">
            Link simulado: esta demo roda 100% no navegador e não abre um PR real.
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Página                                                                    */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [activeAgent, setActiveAgent] = useState(-1);
  const [tab, setTab] = useState<ResultTab>("diff");
  const [prNote, setPrNote] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (pipelineStatus === "completed") {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pipelineStatus]);

  const startPipeline = () => {
    clearTimers();
    setLogs([]);
    setTab("diff");
    setPrNote(false);
    setActiveAgent(0);
    setPipelineStatus("running");

    LOG_SCRIPT.forEach((event) => {
      timers.current.push(
        setTimeout(() => {
          setLogs((prev) => [...prev, event]);
          setActiveAgent(event.agent);
        }, event.t),
      );
    });

    timers.current.push(
      setTimeout(() => {
        setActiveAgent(AGENTS.length);
        setPipelineStatus("completed");
      }, FINISH_AT),
    );
  };

  const resetSimulation = () => {
    clearTimers();
    setLogs([]);
    setActiveAgent(-1);
    setTab("diff");
    setPrNote(false);
    setPipelineStatus("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progress = Math.round((logs.length / LOG_SCRIPT.length) * 100);
  const running = pipelineStatus === "running";

  const agentState = (i: number): "waiting" | "running" | "done" =>
    i < activeAgent ? "done" : i === activeAgent ? "running" : "waiting";

  const tabs: { id: ResultTab; label: string }[] = [
    { id: "diff", label: "Side-by-Side Diff" },
    { id: "tests", label: "Suíte de Testes Gerada" },
    { id: "report", label: "Relatório de Auditoria" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 antialiased selection:bg-sky-400/30">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.10),transparent_65%)]"
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-neutral-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-neutral-50">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-black">
              <GitBranch className="h-4 w-4" />
            </span>
            RefactorPulse
          </Link>
          <span className="hidden h-4 w-px bg-white/10 sm:block" />
          <span className="hidden text-sm text-neutral-500 sm:block">Workspace</span>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-2.5 py-1 text-xs font-medium text-emerald-300 md:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Claude 3.5 Sonnet Connected
            </span>
            <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-neutral-300 sm:inline-block">
              Target: TypeScript 5.x
            </span>
            <button
              onClick={resetSimulation}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Resetar simulação</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {/* Painel de controle */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
            <div className="grid flex-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Repositório
                </label>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5">
                  <GitBranch className="h-4 w-4 shrink-0 text-neutral-500" />
                  <span className="truncate font-mono text-sm text-neutral-200">
                    github.com/enterprise-org/core-billing-service
                  </span>
                  <span className="ml-auto shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-neutral-400">
                    main
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="migration-mode"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500"
                >
                  Modo de migração
                </label>
                <select
                  id="migration-mode"
                  disabled={running}
                  defaultValue="js-ts"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-neutral-200 outline-none transition-colors focus:border-sky-400/50 disabled:opacity-60"
                >
                  <option value="js-ts">JavaScript Legado (Callbacks/ES5) ➔ TypeScript Estrito + Vitest</option>
                  <option value="java" disabled>
                    Java 8 ➔ Java 21 + Spring Boot (em breve)
                  </option>
                  <option value="py" disabled>
                    Python 2 ➔ Python 3.12 (em breve)
                  </option>
                </select>
              </div>
            </div>

            <button
              onClick={startPipeline}
              disabled={running}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-black transition-all hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Pipeline em execução…
                </>
              ) : (
                <>
                  {pipelineStatus === "completed" ? <Sparkles className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {pipelineStatus === "completed" ? "Executar novamente" : "Iniciar Pipeline Autônomo"}
                </>
              )}
            </button>
          </div>

          {(running || pipelineStatus === "completed") && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs text-neutral-500">
                <span>{pipelineStatus === "completed" ? "Pipeline concluído" : "Progresso do pipeline"}</span>
                <span className="font-mono text-neutral-300">{progress}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pipelineStatus === "completed" ? "bg-emerald-400" : "bg-sky-400"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Agentes + Terminal */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-100">Pipeline dos Agentes</h2>
              <span className="text-xs text-neutral-500">
                {Math.min(Math.max(activeAgent, 0), AGENTS.length)}/{AGENTS.length} etapas concluídas
              </span>
            </div>
            {AGENTS.map((agent, i) => (
              <AgentCard key={agent.title} agent={agent} index={i} state={agentState(i)} />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-100">Terminal em Tempo Real</h2>
            <TerminalWindow logs={logs} running={running} />
          </div>
        </section>

        {/* Resultados */}
        {pipelineStatus === "completed" && (
          <section ref={resultsRef} className="scroll-mt-20 space-y-4 pt-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400">
                <Check className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-neutral-50">Resultados da migração</h2>
            </div>

            <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={[
                    "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    tab === t.id ? "bg-white/[0.1] text-white" : "text-neutral-500 hover:text-neutral-300",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "diff" && <DiffViewer />}
            {tab === "tests" && <TestsView />}
            {tab === "report" && <ReportView prNote={prNote} onOpenPr={() => setPrNote(true)} />}
          </section>
        )}

        <footer className="pb-6 pt-4 text-center text-xs text-neutral-600">
          Modo de simulação client-side · nenhum código é enviado a servidores nesta demonstração
        </footer>
      </main>
    </div>
  );
}
