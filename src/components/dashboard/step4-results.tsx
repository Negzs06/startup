"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiffViewer } from "@/components/dashboard/diff-viewer";
import { AuditReport } from "@/components/dashboard/audit-report";
import { AUDIT_REPORT, DIFF_FILES } from "@/lib/mock-data";
import type { MigrationTarget, RepoSource } from "@/lib/types";

export function Step4Results({
  source,
  target,
  onRestart,
}: {
  source: RepoSource;
  target: MigrationTarget;
  onRestart: () => void;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Resultados da migração</CardTitle>
          <CardDescription>
            {source.name} • {target.from} → {target.to}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={onRestart}>
          <RotateCcw className="h-3.5 w-3.5" />
          Nova migração
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="diff">
          <TabsList>
            <TabsTrigger value="diff">Diff de código</TabsTrigger>
            <TabsTrigger value="report">Relatório de auditoria</TabsTrigger>
          </TabsList>
          <TabsContent value="diff" className="mt-6">
            <DiffViewer files={DIFF_FILES} />
          </TabsContent>
          <TabsContent value="report" className="mt-6">
            <AuditReport report={AUDIT_REPORT} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
