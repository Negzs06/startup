import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { REASON_CODES } from "@/lib/domain/reason-codes";
import type { CaseFile } from "@/lib/domain/types";
import type { Dossier } from "@/lib/analysis/schema";
import { daysUntil, formatMoney, LANGUAGE_NAMES } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusBadge, VerdictBadge } from "./status";

export interface QueueRow {
  caseFile: CaseFile;
  verdict: Dossier["verdict"];
}

export function DisputeQueue({ rows, now }: { rows: QueueRow[]; now: string }) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Dispute queue</CardTitle>
        <CardDescription>Open disputes from Stripe, ordered by evidence deadline. Recommendations are rule-based previews until Claude analysis runs.</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Case</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Issuer</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Evidence due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recommendation</TableHead>
            <TableHead className="pr-5"><span className="sr-only">Open</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ caseFile: { dispute, customer }, verdict }) => {
            const days = daysUntil(dispute.evidenceDueBy, now);
            const info = REASON_CODES[dispute.reasonCode];
            return (
              <TableRow key={dispute.id} className="relative">
                <TableCell className="pl-5">
                  <Link href={`/dashboard/disputes/${dispute.id}`} className="font-mono text-sm font-medium after:absolute after:inset-0">
                    {dispute.id}
                  </Link>
                  <div className="text-xs text-muted-foreground">{customer.name}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{info.network === "visa" ? "Visa" : "Mastercard"} {info.code}</div>
                  <div className="max-w-56 truncate text-xs text-muted-foreground">{info.label}</div>
                </TableCell>
                <TableCell>
                  <div>{dispute.issuer.name}</div>
                  <div className="text-xs text-muted-foreground">{dispute.issuer.country} · {LANGUAGE_NAMES[dispute.issuer.language]}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(dispute.amount, dispute.currency)}</TableCell>
                <TableCell>
                  <span className={cn("tabular-nums", days <= 7 && "font-medium text-destructive")}>{days} days</span>
                </TableCell>
                <TableCell><StatusBadge status={dispute.status} /></TableCell>
                <TableCell><VerdictBadge verdict={verdict} /></TableCell>
                <TableCell className="pr-5 text-muted-foreground"><ChevronRight className="size-4" aria-hidden /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
