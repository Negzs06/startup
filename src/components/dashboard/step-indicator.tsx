import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDef {
  id: number;
  label: string;
}

export const DASHBOARD_STEPS: StepDef[] = [
  { id: 1, label: "Fonte" },
  { id: 2, label: "Configuração" },
  { id: 3, label: "Execução" },
  { id: 4, label: "Resultados" },
];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex w-full items-center">
      {DASHBOARD_STEPS.map((step, idx) => {
        const isComplete = currentStep > step.id;
        const isActive = currentStep === step.id;

        return (
          <li key={step.id} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                  isComplete && "border-primary bg-primary text-primary-foreground",
                  isActive && "border-primary text-primary",
                  !isComplete && !isActive && "border-border text-muted-foreground",
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : step.id}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  isActive || isComplete ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < DASHBOARD_STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-4 h-px flex-1 bg-border transition-colors",
                  isComplete && "bg-primary",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
