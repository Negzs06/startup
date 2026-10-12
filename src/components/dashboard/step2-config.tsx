"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MIGRATION_TARGETS } from "@/lib/mock-data";
import type { MigrationTargetId, RepoSource } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Step2Config({
  source,
  onBack,
  onContinue,
}: {
  source: RepoSource;
  onBack: () => void;
  onContinue: (targetId: MigrationTargetId) => void;
}) {
  const [selected, setSelected] = useState<MigrationTargetId | null>(null);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>Configurar a migração</CardTitle>
        <CardDescription>
          Fonte selecionada: <span className="font-medium text-foreground">{source.name}</span>
          {source.fileCount ? ` • ${source.fileCount} arquivos` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {MIGRATION_TARGETS.map((target) => (
            <button
              key={target.id}
              onClick={() => setSelected(target.id)}
              className={cn(
                "flex items-start justify-between gap-4 rounded-lg border px-4 py-4 text-left transition-colors",
                selected === target.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <div>
                <p className="font-medium">{target.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{target.description}</p>
              </div>
              {selected === target.id && (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button
            disabled={!selected}
            className="gap-2"
            onClick={() => selected && onContinue(selected)}
          >
            Iniciar Agentes
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
