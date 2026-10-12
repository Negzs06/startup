"use client";

import { useMemo, useState } from "react";
import { FileCode2, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { diffLines } from "@/lib/diff";
import type { DiffFile } from "@/lib/types";

function CodeSide({
  text,
  lineNo,
  type,
  side,
}: {
  text: string | null;
  lineNo: number | null;
  type: "same" | "added" | "removed";
  side: "old" | "new";
}) {
  const isEmptySlot = text === null;
  const isHighlighted =
    (side === "old" && type === "removed") || (side === "new" && type === "added");

  return (
    <div
      className={cn(
        "flex min-w-0 px-3 py-0.5",
        isHighlighted && side === "old" && "bg-red-500/10",
        isHighlighted && side === "new" && "bg-emerald-500/10",
        isEmptySlot && "bg-neutral-900/40",
      )}
    >
      <span className="w-7 shrink-0 select-none text-right text-neutral-500">
        {lineNo ?? ""}
      </span>
      <span
        className={cn(
          "ml-3 min-w-0 flex-1 whitespace-pre-wrap break-all",
          isHighlighted && side === "old" && "text-red-400",
          isHighlighted && side === "new" && "text-emerald-400",
          !isHighlighted && "text-neutral-300",
        )}
      >
        {text ?? ""}
      </span>
    </div>
  );
}

export function DiffViewer({ files }: { files: DiffFile[] }) {
  const [activePath, setActivePath] = useState(files[0]?.path ?? "");
  const activeFile = files.find((f) => f.path === activePath) ?? files[0];

  const rows = useMemo(
    () => (activeFile ? diffLines(activeFile.oldCode, activeFile.newCode) : []),
    [activeFile],
  );

  if (!activeFile) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {files.map((file) => (
          <button
            key={file.path}
            onClick={() => setActivePath(file.path)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors",
              file.path === activePath
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/50",
            )}
          >
            <FileCode2 className="h-3.5 w-3.5" />
            <span className="max-w-[220px] truncate">{file.path}</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Plus className="h-3 w-3" />
              {file.linesAdded}
            </span>
            <span className="flex items-center gap-1 text-red-500">
              <Minus className="h-3 w-3" />
              {file.linesRemoved}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60">
        <div className="grid grid-cols-2 border-b border-border/60 bg-muted/50 text-xs font-medium">
          <div className="flex items-center gap-2 border-r border-border/60 px-3 py-2 text-muted-foreground">
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              ANTES
            </Badge>
            Código legado
          </div>
          <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              DEPOIS
            </Badge>
            Modernizado por Claude Sonnet
          </div>
        </div>

        <div className="max-h-[28rem] overflow-y-auto bg-neutral-950 font-mono text-[12.5px] leading-relaxed">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-2">
              <div className="border-r border-white/5">
                <CodeSide text={row.oldText} lineNo={row.oldLine} type={row.type} side="old" />
              </div>
              <div>
                <CodeSide text={row.newText} lineNo={row.newLine} type={row.type} side="new" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
