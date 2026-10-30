import { Badge } from "@/components/ui/badge";
import type { DisputeStatus } from "@/lib/types";

const LABELS: Record<DisputeStatus, string> = {
  new: "New",
  ready: "Ready to file",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  accepted: "Accepted",
};

export function StatusBadge({ status }: { status: DisputeStatus }) {
  const variant = status === "won" ? "default" : status === "lost" ? "destructive" : "secondary";
  return <Badge variant={variant}>{LABELS[status]}</Badge>;
}
