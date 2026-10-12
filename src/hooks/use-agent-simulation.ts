"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_LOG_SCRIPT, AGENT_STEPS } from "@/lib/mock-data";
import type { AgentId, AgentLogLine, AgentStatus } from "@/lib/types";

export type AgentStatusMap = Record<AgentId, AgentStatus>;

function initialStatusMap(): AgentStatusMap {
  return AGENT_STEPS.reduce((acc, step) => {
    acc[step.id] = "pending";
    return acc;
  }, {} as AgentStatusMap);
}

/**
 * Orquestra a reprodução do script de logs do agente em tempo real,
 * simulando o stream que viria de um backend/agente real via SSE.
 */
export function useAgentSimulation() {
  const [visibleLogs, setVisibleLogs] = useState<AgentLogLine[]>([]);
  const [statusMap, setStatusMap] = useState<AgentStatusMap>(initialStatusMap);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    setVisibleLogs([]);
    setStatusMap(initialStatusMap());
    setIsComplete(false);
    setIsRunning(true);

    let index = 0;

    const pushNext = () => {
      if (index >= AGENT_LOG_SCRIPT.length) {
        setIsRunning(false);
        setIsComplete(true);
        return;
      }

      const line = AGENT_LOG_SCRIPT[index];
      setVisibleLogs((prev) => [...prev, line]);

      setStatusMap((prev) => {
        const next = { ...prev };
        next[line.agentId] = line.level === "error" ? "retrying" : "running";

        const isLastLineForAgent =
          index === AGENT_LOG_SCRIPT.length - 1 ||
          AGENT_LOG_SCRIPT[index + 1]?.agentId !== line.agentId;

        if (isLastLineForAgent && line.level !== "error") {
          next[line.agentId] = "success";
        }
        return next;
      });

      index += 1;
      const delay = line.level === "command" ? 650 : 480;
      timeoutRef.current = setTimeout(pushNext, delay);
    };

    timeoutRef.current = setTimeout(pushNext, 300);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { visibleLogs, statusMap, isRunning, isComplete, start };
}
