import { ExternalLink, GitPullRequest, Package, ShieldCheck, TestTube2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AuditReport as AuditReportType } from "@/lib/types";

const DECISION_LABEL: Record<AuditReportType["decisions"][number]["kind"], string> = {
  architecture: "Arquitetura",
  dependency: "Dependência",
  test: "Testes",
  safety: "Segurança",
};

export function AuditReport({ report }: { report: AuditReportType }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardContent className="flex flex-col items-start justify-between gap-4 pt-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Modernização concluída com 0% de regressão</p>
              <p className="text-sm text-muted-foreground">
                {report.testsAdded} testes de caracterização • {report.coveragePercent}% de
                cobertura estimada
              </p>
            </div>
          </div>
          <Button
            className="gap-2"
            nativeButton={false}
            render={
              <a href={report.pullRequestUrl} target="_blank" rel="noreferrer">
                <GitPullRequest className="h-4 w-4" />
                Ver PR #{report.pullRequestNumber}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            }
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Relatório de Auditoria Arquitetural</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{report.summaryMarkdown}</p>

          <Separator />

          <div className="space-y-3">
            {report.decisions.map((decision) => (
              <div key={decision.title} className="flex gap-3">
                <Badge variant="secondary" className="mt-0.5 h-5 shrink-0 text-[11px]">
                  {DECISION_LABEL[decision.kind]}
                </Badge>
                <div>
                  <p className="text-sm font-medium">{decision.title}</p>
                  <p className="text-sm text-muted-foreground">{decision.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <TestTube2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Cobertura de testes</p>
                <p className="text-sm text-muted-foreground">
                  {report.testsAdded} novos testes adicionados • {report.coveragePercent}%
                  de cobertura
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Package className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Dependências</p>
                <p className="text-sm text-muted-foreground">
                  Removidas: {report.dependenciesRemoved.join(", ")} • Adicionadas:{" "}
                  {report.dependenciesAdded.join(", ")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
