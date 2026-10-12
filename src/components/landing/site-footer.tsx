import { GitBranch } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <GitBranch className="h-4 w-4" />
          RefactorPulse
        </div>
        <p>Construído com Claude Sonnet para o ecossistema Anthropic.</p>
        <p>© 2026 RefactorPulse. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
