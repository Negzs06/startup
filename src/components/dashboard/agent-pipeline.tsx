import { FlaskConical, RefreshCw, Rocket, Search, Zap, type LucideIcon } from "lucide-react";
import { AGENT_STEPS } from "@/lib/mock-data";
import type { AgentId } from "@/lib/types";
import type { AgentStatusMap } from "@/hooks/use-agent-simulation";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  search: Search,
  flask: FlaskConical,
  zap: Zap,
  refresh: RefreshCw,
  rocket: Rocket,
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-border text-muted-foreground",
  running: "border-primary text-primary bg-primary/5",
  success: "border-emerald-500/60 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5",
  retrying: "border-amber-500/60 text-amber-600 dark:text-amber-400 bg-amber-500/5",
  error: "border-destructive text-destructive bg-destructive/5",
};

export function AgentPipeline({ statusMap }: { statusMap: AgentStatusMap }) {
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {AGENT_STEPS.map((step) => {
        const Icon = ICONS[step.icon];
        const status = statusMap[step.id as AgentId];
        const isRunning = status === "running" || status === "retrying";

        return (
          <div
            key={step.id}
            className={cn(
              "rounded-lg border px-3 py-3 transition-colors",
              STATUS_STYLES[status] ?? STATUS_STYLES.pending,
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", isRunning && "animate-pulse")} />
              <span className="text-xs font-medium uppercase tracking-wide">
                {status === "pending" && "Aguardando"}
                {status === "running" && "Executando"}
                {status === "retrying" && "Corrigindo"}
                {status === "success" && "Concluído"}
                {status === "error" && "Erro"}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium">{step.title}</p>
            <p className="text-xs text-muted-foreground">{step.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
