"use client";

import { useEffect, useRef, useState } from "react";
import type { PORTFOLIO } from "@/lib/disputes";
import type { AnalysisResult, Dispute, DisputeStatus } from "@/lib/types";
import { CaseView } from "./case-view";
import { DisputeQueue } from "./dispute-queue";
import { KpiRow } from "./kpi-row";
import { PIPELINE_STEPS } from "./pipeline";

export function DashboardClient({ disputes, portfolio }: { disputes: Dispute[]; portfolio: typeof PORTFOLIO }) {
  const [selectedId, setSelectedId] = useState(disputes[0].id);
  const [statuses, setStatuses] = useState<Record<string, DisputeStatus>>(
    () => Object.fromEntries(disputes.map((d) => [d.id, d.status])),
  );
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});
  const [stages, setStages] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    const active = timers.current;
    return () => Object.values(active).forEach(clearInterval);
  }, []);

  const stopTimer = (id: string) => {
    clearInterval(timers.current[id]);
    delete timers.current[id];
  };

  async function analyze(id: string) {
    setErrors((e) => ({ ...e, [id]: "" }));
    setStages((s) => ({ ...s, [id]: 0 }));
    // Advance the visual pipeline while the request runs; hold on the synthesis step until it returns.
    timers.current[id] = setInterval(
      () => setStages((s) => ({ ...s, [id]: Math.min((s[id] ?? 0) + 1, 2) })),
      900,
    );

    try {
      const res = await fetch(`/api/disputes/${id}/analyze`, { method: "POST" });
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
      const result: AnalysisResult = await res.json();
      setAnalyses((a) => ({ ...a, [id]: result }));
      setStatuses((s) => ({ ...s, [id]: "ready" }));
    } catch (err) {
      setErrors((e) => ({ ...e, [id]: err instanceof Error ? err.message : "Analysis failed" }));
    } finally {
      stopTimer(id);
      setStages((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    }
  }

  const selected = disputes.find((d) => d.id === selectedId)!;

  return (
    <div className="space-y-6">
      <KpiRow portfolio={portfolio} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <DisputeQueue disputes={disputes} statuses={statuses} selectedId={selectedId} onSelect={setSelectedId} />
        <CaseView
          key={selected.id}
          dispute={selected}
          status={statuses[selected.id]}
          analysis={analyses[selected.id]}
          stage={selected.id in stages ? Math.min(stages[selected.id], PIPELINE_STEPS.length - 1) : null}
          error={errors[selected.id] || null}
          onAnalyze={() => analyze(selected.id)}
          onFile={(status) => setStatuses((s) => ({ ...s, [selected.id]: status }))}
        />
      </div>
    </div>
  );
}
