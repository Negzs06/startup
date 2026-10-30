import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const PIPELINE_STEPS = [
  "Ingest records",
  "Audit CE 3.0",
  "Forensic synthesis",
  "Localize letter",
  "Ready to file",
];

/** `stage` is the index of the step in progress; PIPELINE_STEPS.length means all done. */
export function Pipeline({ stage }: { stage: number }) {
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {PIPELINE_STEPS.map((label, i) => {
        const done = i < stage;
        const active = i === stage;
        return (
          <li key={label} className={cn("flex items-center gap-2", !done && !active && "text-muted-foreground")}>
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
