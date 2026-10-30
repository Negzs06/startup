import { AlertTriangle, CheckCircle2, CircleDashed, ShieldAlert, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CE3_ELEMENT_LABELS, CE3_REASON_LABELS, type Ce3Audit } from "@/lib/ce3/audit";
import type { AnalysisResult, Dossier, HighlightedClause, TimelineEntry } from "@/lib/analysis/schema";
import type { EvidenceSource } from "@/lib/domain/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { VerdictBadge } from "./status";

export function VerdictCard({ dossier }: { dossier: Dossier }) {
  const accept = dossier.verdict.decision === "accept";
  return (
    <Card className={cn(accept ? "border-foreground/20" : "border-success/40")}>
      <CardHeader>
        <CardDescription>Verdict</CardDescription>
        <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
          {accept ? "Accept this dispute" : "Contest this dispute"}
          <VerdictBadge verdict={dossier.verdict} className="text-sm" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        <p>{dossier.verdict.rationale}</p>
        <p className="text-muted-foreground">{dossier.reasonCodeSummary}</p>
      </CardContent>
    </Card>
  );
}

export function Ce3Card({ ce3 }: { ce3: Ce3Audit }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visa CE 3.0 audit</CardTitle>
        <CardDescription>Deterministic check of prior transactions. Simplified reading — verify against current Visa rules.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!ce3.applicable ? (
          <p className="flex gap-2 text-muted-foreground">
            <CircleDashed className="mt-0.5 size-4 shrink-0" aria-hidden /> Not applicable. {ce3.reason}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {ce3.eligible ? (
                <Badge variant="success"><CheckCircle2 aria-hidden /> Eligible</Badge>
              ) : (
                <Badge variant="destructive"><XCircle aria-hidden /> Not eligible</Badge>
              )}
              <span className="text-muted-foreground">
                {ce3.qualifyingCount} of {ce3.required} required qualifying transactions
              </span>
            </div>
            <ul className="divide-y rounded-lg border">
              {ce3.candidates.map((c) => (
                <li key={c.transactionId} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs">{c.transactionId}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.matchedElements.length ? (
                        c.matchedElements.map((e) => (
                          <Badge key={e} variant="secondary" className="font-normal">{CE3_ELEMENT_LABELS[e]}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No matching elements</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted-foreground tabular-nums">{c.ageDays} days old</div>
                    {c.qualifies ? (
                      <span className="text-xs font-medium text-success">Qualifies</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{CE3_REASON_LABELS[c.reason]}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const SOURCE_LABEL: Record<EvidenceSource, string> = {
  stripe: "Stripe",
  auth0: "Auth0",
  posthog: "PostHog",
  zendesk: "Zendesk",
  tos: "Terms",
};

export function TimelineCard({ timeline, chargeAt }: { timeline: TimelineEntry[]; chargeAt: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chronological dossier</CardTitle>
        <CardDescription>Every entry cites a source record; timestamps come from the record, not the model.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-5 border-l pl-6">
          {timeline.map((e) => (
            <li key={e.ref} className="relative">
              <span
                aria-hidden
                className={cn(
                  "absolute top-1.5 -left-[29px] size-2.5 rounded-full ring-4 ring-card",
                  e.significance === "key" ? "bg-primary" : e.significance === "supporting" ? "bg-primary/45" : "bg-border",
                )}
              />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <time dateTime={e.at}>{formatDateTime(e.at)}</time>
                <Badge variant="outline" className="font-normal">{SOURCE_LABEL[e.source]}</Badge>
                {e.at > chargeAt && e.source !== "stripe" ? <span>after charge</span> : null}
                {e.significance === "key" ? <span className="font-medium text-primary">key evidence</span> : null}
              </div>
              <p className="mt-1 text-sm font-medium">{e.title}</p>
              <p className="text-sm text-muted-foreground">{e.detail}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">{e.ref}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function HighlightedText({ text, highlight }: { text: string; highlight: string | null }) {
  const index = highlight ? text.indexOf(highlight) : -1;
  if (!highlight || index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-highlight px-0.5 text-foreground">{highlight}</mark>
      {text.slice(index + highlight.length)}
    </>
  );
}

export function ClausesCard({ clauses, version, acceptedAt }: { clauses: HighlightedClause[]; version: string; acceptedAt: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms of Service clauses</CardTitle>
        <CardDescription>
          Version {version}, accepted {formatDate(acceptedAt)}. Highlights are verified verbatim quotes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {clauses.length === 0 ? <p className="text-sm text-muted-foreground">No clauses selected.</p> : null}
        {clauses.map((c) => (
          <figure key={`${c.clauseId}-${c.highlight}`} className="rounded-lg border p-4">
            <figcaption className="text-sm font-medium">{c.title}</figcaption>
            <blockquote className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <HighlightedText text={c.text} highlight={c.highlight} />
            </blockquote>
            <p className="mt-2 text-xs"><span className="font-medium">Why it matters:</span> {c.relevance}</p>
          </figure>
        ))}
      </CardContent>
    </Card>
  );
}

const REQ_ICON = {
  met: <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Met" />,
  partial: <AlertTriangle className="size-4 shrink-0 text-warning" aria-label="Partially met" />,
  not_met: <XCircle className="size-4 shrink-0 text-destructive" aria-label="Not met" />,
};

export function RequirementsCard({ requirements }: { requirements: Dossier["requirements"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reason-code requirements</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm">
          {requirements.map((r) => (
            <li key={r.requirement} className="flex gap-2">
              {REQ_ICON[r.status]}
              <div>
                <p className="font-medium">{r.requirement}</p>
                <p className="text-muted-foreground">{r.note}</p>
                {r.evidenceRefs.length ? (
                  <p className="mt-0.5 font-mono text-[11px] break-all text-muted-foreground/80">{r.evidenceRefs.join(" · ")}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function FlagsCard({ result }: { result: AnalysisResult }) {
  const { dossier, guardrails } = result;
  if (!dossier.injectionFlags.length && !guardrails.length && !dossier.evidenceGaps.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {dossier.injectionFlags.length ? (
          <section>
            <h3 className="flex items-center gap-1.5 font-medium text-destructive">
              <ShieldAlert className="size-4" aria-hidden /> Prompt-injection attempts
            </h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              {dossier.injectionFlags.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </section>
        ) : null}
        {guardrails.length ? (
          <section>
            <h3 className="font-medium">Guardrails applied</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              {guardrails.map((g) => <li key={g}>{g}</li>)}
            </ul>
          </section>
        ) : null}
        {dossier.evidenceGaps.length ? (
          <section>
            <h3 className="font-medium">Evidence gaps</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              {dossier.evidenceGaps.map((g) => <li key={g}>{g}</li>)}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
