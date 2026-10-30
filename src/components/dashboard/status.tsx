import { CheckCircle2, CircleSlash, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DisputeStatus } from "@/lib/domain/types";
import type { Dossier } from "@/lib/analysis/schema";

const STATUS: Record<DisputeStatus, { label: string; variant: "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  needs_review: { label: "Needs review", variant: "warning" },
  ready_to_submit: { label: "Ready to submit", variant: "secondary" },
  submitted: { label: "Submitted", variant: "outline" },
  won: { label: "Won", variant: "success" },
  lost: { label: "Lost", variant: "destructive" },
  accepted: { label: "Accepted", variant: "outline" },
};

export function StatusBadge({ status }: { status: DisputeStatus }) {
  const s = STATUS[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function VerdictBadge({ verdict, className }: { verdict: Dossier["verdict"]; className?: string }) {
  const contest = verdict.decision === "contest";
  return (
    <Badge variant={contest ? "success" : "secondary"} className={className}>
      {contest ? <Scale aria-hidden /> : <CircleSlash aria-hidden />}
      {contest ? "Contest" : "Accept"}
      <span className="font-normal opacity-80">· {verdict.confidence}</span>
    </Badge>
  );
}

export function CheckIcon() {
  return <CheckCircle2 className="size-4 text-success" aria-hidden />;
}
