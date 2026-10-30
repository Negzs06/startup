import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/lib/format";
import type { Dispute, DisputeStatus } from "@/lib/types";
import { StatusBadge } from "./status-badge";

interface Props {
  disputes: Dispute[];
  statuses: Record<string, DisputeStatus>;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function DisputeQueue({ disputes, statuses, selectedId, onSelect }: Props) {
  return (
    <ul className="divide-y rounded-xl border">
      {disputes.map((d) => (
        <li key={d.id}>
          <button
            type="button"
            onClick={() => onSelect(d.id)}
            aria-current={d.id === selectedId}
            className={cn(
              "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/60",
              d.id === selectedId && "bg-muted",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium">{formatMoney(d.amountCents, d.currency)}</span>
              <StatusBadge status={statuses[d.id]} />
            </span>
            <span className="text-sm text-muted-foreground">
              {d.customer.name} · {d.network === "visa" ? "Visa" : "Mastercard"} {d.reasonCode}
            </span>
            <span className="text-xs text-muted-foreground">
              {d.gateway} · due {formatDate(d.dueBy)} · issuer {d.issuer.country}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
