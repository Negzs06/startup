"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Info, Loader2, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisResult } from "@/lib/analysis/schema";
import { REASON_CODES } from "@/lib/domain/reason-codes";
import type { CaseFile } from "@/lib/domain/types";
import { daysUntil, formatDate, formatDateTime, formatMoney, LANGUAGE_NAMES } from "@/lib/format";
import { Ce3Card, ClausesCard, FlagsCard, RequirementsCard, TimelineCard, VerdictCard } from "./case-sections";
import { CoverLetterCard } from "./cover-letter";
import { StatusBadge } from "./status";

export function CaseWorkspace({ caseFile, initial, now }: { caseFile: CaseFile; initial: AnalysisResult; now: string }) {
  const [result, setResult] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const { dispute, customer, charge, tickets, tos } = caseFile;
  const info = REASON_CODES[dispute.reasonCode];
  const accept = result.dossier.verdict.decision === "accept";

  async function runAnalysis() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/disputes/${dispute.id}/analyze`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      setResult(body as AnalysisResult);
      setSubmittedAt(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Dispute queue
      </Link>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{dispute.id}</h1>
            <StatusBadge status={dispute.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {info.network === "visa" ? "Visa" : "Mastercard"} {info.code} · {info.label}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div><dt className="inline text-muted-foreground">Amount </dt><dd className="inline font-medium">{formatMoney(dispute.amount, dispute.currency)}</dd></div>
            <div><dt className="inline text-muted-foreground">Issuer </dt><dd className="inline font-medium">{dispute.issuer.name} ({dispute.issuer.country}, {LANGUAGE_NAMES[dispute.issuer.language]})</dd></div>
            <div><dt className="inline text-muted-foreground">Evidence due </dt><dd className="inline font-medium">{formatDate(dispute.evidenceDueBy)} · {daysUntil(dispute.evidenceDueBy, now)} days</dd></div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={runAnalysis} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            {pending ? "Analysing…" : result.source === "claude" ? "Re-run Claude analysis" : "Run Claude analysis"}
          </Button>
          <Button onClick={() => setSubmittedAt(new Date().toISOString())} disabled={pending || submittedAt !== null}>
            <Send aria-hidden />
            {accept ? "Accept & refund (simulated)" : "Submit to Stripe (simulated)"}
          </Button>
        </div>
      </header>

      <div aria-live="polite" className="space-y-3">
        <SourceBanner result={result} />
        {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
        {submittedAt ? (
          <p className="flex gap-2 rounded-lg border bg-background p-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              Simulated at {formatDateTime(submittedAt)}. Nothing was sent to Stripe — in production this step{" "}
              {accept ? "accepts the dispute via the Dispute API" : "uploads the evidence package and submits it via the Dispute API"}.
            </span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <VerdictCard dossier={result.dossier} />
          <CoverLetterCard letter={result.dossier.coverLetter} templated={result.source === "rule-based"} />
          <TimelineCard timeline={result.dossier.timeline} chargeAt={charge.createdAt} />
          <ClausesCard clauses={result.dossier.clauses} version={tos.version} acceptedAt={tos.acceptedAt} />
        </div>
        <div className="space-y-6">
          <Ce3Card ce3={result.ce3} />
          <RequirementsCard requirements={result.dossier.requirements} />
          <FlagsCard result={result} />
          <Card>
            <CardHeader>
              <CardTitle>Case file</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Customer</dt><dd>{customer.name}</dd>
                <dt className="text-muted-foreground">Account</dt><dd className="font-mono text-xs leading-5">{customer.accountId}</dd>
                <dt className="text-muted-foreground">Charge</dt><dd>{charge.description} · {formatDate(charge.createdAt)}</dd>
                <dt className="text-muted-foreground">Processor ID</dt><dd className="font-mono text-xs leading-5 break-all">{dispute.processorDisputeId}</dd>
              </dl>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Cardholder claim · untrusted</p>
                <p className="mt-1">{dispute.cardholderClaim}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Support tickets · untrusted</p>
                {tickets.length === 0 ? <p className="mt-1 text-muted-foreground">None on file.</p> : null}
                {tickets.map((t) => (
                  <details key={t.id} className="mt-2 rounded-lg border p-3">
                    <summary className="cursor-pointer font-medium">
                      {t.id} · {t.subject} <span className="font-normal text-muted-foreground">({t.status})</span>
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {t.messages.map((m) => (
                        <li key={m.at} className="rounded-md bg-muted/50 p-2">
                          <p className="text-xs text-muted-foreground">{m.author === "agent" ? "Support agent" : "Customer"} · {formatDateTime(m.at)}</p>
                          <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SourceBanner({ result }: { result: AnalysisResult }) {
  if (result.source === "claude") {
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-accent/60 p-3 text-sm">
        <Bot className="size-4 text-primary" aria-hidden />
        <span className="font-medium">Claude analysis</span>
        <Badge variant="outline" className="font-mono font-normal">{result.model}</Badge>
        <span className="text-muted-foreground">generated {formatDateTime(result.generatedAt)}</span>
        {result.guardrails.length ? <span className="text-muted-foreground">· {result.guardrails.length} guardrail note(s) below</span> : null}
      </p>
    );
  }
  return (
    <p className="flex gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <span className="font-medium">Rule-based dossier</span> — deterministic rules and templates, no model call.{" "}
        <span className="text-muted-foreground">{result.fallbackReason}</span>
      </span>
    </p>
  );
}
