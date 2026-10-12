"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, Terminal, XCircle } from "lucide-react";
import type { AgentLogLine } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<AgentLogLine["level"], string> = {
  info: "text-muted-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-red-500 dark:text-red-400",
  command: "text-primary font-medium",
};

const LEVEL_ICON: Partial<Record<AgentLogLine["level"], typeof Info>> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

export function AgentTerminal({ logs }: { logs: AgentLogLine[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs.length]);

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-neutral-950">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <Terminal className="h-3.5 w-3.5 text-neutral-400" />
        <span className="text-xs font-medium text-neutral-400">agent-feed · live</span>
        <span className="relative ml-auto flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      </div>

      <div className="h-80 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
        {logs.length === 0 && (
          <p className="text-neutral-500">Aguardando início da execução dos agentes…</p>
        )}

        {logs.map((line) => {
          const Icon = line.level === "command" ? null : LEVEL_ICON[line.level];
          return (
            <div key={line.id} className="flex items-start gap-2 py-0.5">
              <span className="shrink-0 text-neutral-500">{line.timestamp}</span>
              {Icon && (
                <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", LEVEL_STYLES[line.level])} />
              )}
              <span className={cn("whitespace-pre-wrap", LEVEL_STYLES[line.level])}>
                {line.message}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
