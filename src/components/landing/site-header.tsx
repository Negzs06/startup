import Link from "next/link";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GitBranch className="h-4 w-4" />
          </span>
          RefactorPulse
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#fluxo" className="transition-colors hover:text-foreground">
            Como funciona
          </a>
          <a href="#seguranca" className="transition-colors hover:text-foreground">
            Segurança
          </a>
          <a href="#enterprise" className="transition-colors hover:text-foreground">
            Enterprise
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="hidden sm:inline-flex"
            nativeButton={false}
            render={<Link href="/dashboard">Entrar</Link>}
          />
          <Button nativeButton={false} render={<Link href="/dashboard">Agendar Demo</Link>} />
        </div>
      </div>
    </header>
  );
}
