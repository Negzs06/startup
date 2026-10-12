"use client";

import { useState } from "react";
import Link from "next/link";
import { GitBranch } from "lucide-react";
import { StepIndicator } from "@/components/dashboard/step-indicator";
import { Step1Source } from "@/components/dashboard/step1-source";
import { Step2Config } from "@/components/dashboard/step2-config";
import { Step3Execution } from "@/components/dashboard/step3-execution";
import { Step4Results } from "@/components/dashboard/step4-results";
import { MIGRATION_TARGETS } from "@/lib/mock-data";
import type { MigrationTargetId, RepoSource } from "@/lib/types";

export default function DashboardPage() {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<RepoSource | null>(null);
  const [targetId, setTargetId] = useState<MigrationTargetId | null>(null);

  const target = MIGRATION_TARGETS.find((t) => t.id === targetId) ?? null;

  function handleRestart() {
    setSource(null);
    setTargetId(null);
    setStep(1);
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GitBranch className="h-4 w-4" />
            </span>
            RefactorPulse
          </Link>
          <span className="ml-3 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            Workspace
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10">
          <StepIndicator currentStep={step} />
        </div>

        {step === 1 && (
          <Step1Source
            onContinue={(src) => {
              setSource(src);
              setStep(2);
            }}
          />
        )}

        {step === 2 && source && (
          <Step2Config
            source={source}
            onBack={() => setStep(1)}
            onContinue={(id) => {
              setTargetId(id);
              setStep(3);
            }}
          />
        )}

        {step === 3 && source && target && (
          <Step3Execution source={source} target={target} onComplete={() => setStep(4)} />
        )}

        {step === 4 && source && target && (
          <Step4Results source={source} target={target} onRestart={handleRestart} />
        )}
      </main>
    </div>
  );
}
