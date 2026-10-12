"use client";

import { useEffect, useMemo } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AgentPipeline } from "@/components/dashboard/agent-pipeline";
import { AgentTerminal } from "@/components/dashboard/agent-terminal";
import { useAgentSimulation } from "@/hooks/use-agent-simulation";
import { AGENT_LOG_SCRIPT } from "@/lib/mock-data";
import type { MigrationTarget, RepoSource } from "@/lib/types";

export function Step3Execution({
  source,
  target,
  onComplete,
}: {
  source: RepoSource;
  target: MigrationTarget;
  onComplete: () => void;
}) {
  const { visibleLogs, statusMap, isRunning, isComplete, start } = useAgentSimulation();

  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = useMemo(
    () => Math.round((visibleLogs.length / AGENT_LOG_SCRIPT.length) * 100),
    [visibleLogs.length],
  );

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Agentes em execução</CardTitle>
        <CardDescription>
          {source.name} • {target.from} → {target.to}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AgentPipeline statusMap={statusMap} />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <AgentTerminal logs={visibleLogs} />

        <div className="flex justify-end">
          {isRunning && (
            <Button disabled className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Executando pipeline…
            </Button>
          )}
          {isComplete && (
            <Button onClick={onComplete} className="gap-2">
              Ver resultados
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
