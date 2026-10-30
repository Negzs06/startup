"use client";

import { useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Loader2, Send, Sparkles, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { AnalysisResult, Dispute, DisputeStatus } from "@/lib/types";
import { Pipeline, PIPELINE_STEPS } from "./pipeline";
import { StatusBadge } from "./status-badge";

interface Props {
  dispute: Dispute;
  status: DisputeStatus;
  analysis: AnalysisResult | undefined;
  stage: number | null;
  error: string | null;
  onAnalyze: () => void;
  onFile: (status: DisputeStatus) => void;
}

export function CaseView({ dispute, status, analysis, stage, error, onAnalyze, onFile }: Props) {
  const analyzing = stage !== null;
  const resolved = status === "won" || status === "lost";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">
              {formatMoney(dispute.amountCents, dispute.currency)} · {dispute.customer.name}
            </CardTitle>
            <CardDescription>
              {dispute.network === "visa" ? "Visa" : "Mastercard"} {dispute.reasonCode} - {dispute.reasonLabel}
            </CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <Fact label="Gateway" value={dispute.gateway} />
          <Fact label="Opened" value={formatDate(dispute.createdAt)} />
          <Fact label="Respond by" value={formatDate(dispute.dueBy)} />
          <Fact label="Issuer" value={`${dispute.issuer.bank} (${dispute.issuer.languageName})`} />
        </dl>
      </CardHeader>

      <CardContent className="space-y-6">
        {resolved && (
          <p className="text-sm text-muted-foreground">
            This dispute is closed. Evidence is available for open disputes only in the demo.
          </p>
        )}

        {!resolved && !analysis && (
          <div className="space-y-4">
            {analyzing ? (
              <Pipeline stage={stage} />
            ) : (
              <Button onClick={onAnalyze} className="gap-2">
                <Sparkles className="h-4 w-4" /> Run ChargeGuard analysis
              </Button>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {analysis && (
          <>
            <Pipeline stage={PIPELINE_STEPS.length} />
            {analysis.note && (
              <p className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {analysis.note}
              </p>
            )}
            <AnalysisTabs dispute={dispute} analysis={analysis} />
            <FilingBar dispute={dispute} analysis={analysis} status={status} onFile={onFile} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}

function AnalysisTabs({ dispute, analysis }: { dispute: Dispute; analysis: AnalysisResult }) {
  const { dossier, ce3 } = analysis;
  const [lang, setLang] = useState<"localized" | "english">("localized");
  const hasLetter = dossier.coverLetter.english !== "";

  return (
    <Tabs defaultValue="verdict">
      <TabsList>
        <TabsTrigger value="verdict">Verdict</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="clauses">Clauses</TabsTrigger>
        <TabsTrigger value="letter">Cover letter</TabsTrigger>
      </TabsList>

      <TabsContent value="verdict" className="space-y-4 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={dossier.verdict === "contest" ? "default" : "secondary"} className="text-sm">
            {dossier.verdict === "contest" ? "Contest" : "Accept the dispute"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Estimated success: {Math.round(dossier.confidence * 100)}%
          </span>
          <span className="text-xs text-muted-foreground">
            {analysis.source === "claude" ? `Claude (${analysis.model})` : "Demo rules"}
          </span>
        </div>
        <p className="text-sm">{dossier.rationale}</p>

        <div className="rounded-lg border p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            Visa CE 3.0 audit
            {ce3.applicable ? (
              ce3.eligible ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Badge variant="secondary">Not applicable</Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">{ce3.summary}</p>
          {ce3.applicable && (
            <ul className="mt-3 space-y-1.5 text-sm">
              {ce3.qualifying.map((q) => (
                <li key={q.transaction.id} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {q.transaction.id} · {q.ageDays} days · matched {q.matched.join(", ")}
                </li>
              ))}
              {ce3.rejected.map((r) => (
                <li key={r.transaction.id} className="flex items-center gap-2 text-muted-foreground">
                  <XCircle className="h-4 w-4" />
                  {r.transaction.id} · {r.reason}
                </li>
              ))}
            </ul>
          )}
        </div>

        {dossier.risks.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-medium">Risks</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {dossier.risks.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}
      </TabsContent>

      <TabsContent value="timeline" className="pt-3">
        <ol className="space-y-3 border-l pl-4">
          {dossier.timeline.map((e, i) => (
            <li key={i} className="text-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {formatDateTime(e.at)} <Badge variant="secondary" className="uppercase">{e.source}</Badge>
              </div>
              <p className="mt-0.5">{e.event}</p>
            </li>
          ))}
        </ol>
      </TabsContent>

      <TabsContent value="clauses" className="space-y-3 pt-3">
        {dossier.clauses.length === 0 && <p className="text-sm text-muted-foreground">No clauses apply.</p>}
        {dossier.clauses.map((c) => (
          <blockquote key={c.id} className="rounded-lg border-l-4 border-primary bg-muted/40 p-3 text-sm">
            <p>&ldquo;{c.quote}&rdquo;</p>
            <footer className="mt-1 text-xs text-muted-foreground">{c.id} - {c.relevance}</footer>
          </blockquote>
        ))}
      </TabsContent>

      <TabsContent value="letter" className="space-y-3 pt-3">
        {!hasLetter ? (
          <p className="text-sm text-muted-foreground">No letter is generated when the recommendation is to accept.</p>
        ) : (
          <>
            <div className="flex gap-2">
              <Button size="sm" variant={lang === "localized" ? "default" : "outline"} onClick={() => setLang("localized")}>
                {dispute.issuer.languageName}
              </Button>
              <Button size="sm" variant={lang === "english" ? "default" : "outline"} onClick={() => setLang("english")}>
                English
              </Button>
            </div>
            <pre lang={lang === "localized" ? dossier.coverLetter.language : "en"} className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 font-sans text-sm">
              {lang === "localized" ? dossier.coverLetter.localized : dossier.coverLetter.english}
            </pre>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

function FilingBar({
  dispute,
  analysis,
  status,
  onFile,
}: {
  dispute: Dispute;
  analysis: AnalysisResult;
  status: DisputeStatus;
  onFile: (status: DisputeStatus) => void;
}) {
  const [busy, setBusy] = useState(false);
  const contest = analysis.dossier.verdict === "contest";

  if (status === "submitted" || status === "accepted") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        {status === "submitted" ? "Evidence package submitted." : "Dispute accepted."} Demo mode: nothing was sent to {dispute.gateway}.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        disabled={busy}
        className="gap-2"
        onClick={() => {
          setBusy(true);
          // Simulated representment: the MVP has no gateway credentials.
          setTimeout(() => onFile(contest ? "submitted" : "accepted"), 600);
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {contest ? `Submit to ${dispute.gateway}` : "Accept dispute"}
      </Button>
      <span className="text-xs text-muted-foreground">Demo mode: the submission is simulated.</span>
    </div>
  );
}
