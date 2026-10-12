import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/12%),transparent_60%)]"
      />
      <div className="mx-auto max-w-4xl text-center">
        <Badge variant="secondary" className="mb-6 gap-1.5 py-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Powered by Claude Sonnet · Anthropic
        </Badge>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          Modernize monolitos legados com{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            segurança garantida por testes
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          O RefactorPulse analisa seu repositório legado, gera testes de caracterização,
          refatora com o raciocínio de ponta da Anthropic e abre um Pull Request limpo —
          sem quebrar o que já funciona.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="gap-2"
            nativeButton={false}
            render={
              <Link href="/dashboard">
                Iniciar Migração Gratuita
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <Button
            size="lg"
            variant="outline"
            className="gap-2"
            nativeButton={false}
            render={
              <a href="#fluxo">
                <ShieldCheck className="h-4 w-4" />
                Ver como garantimos 0% de regressão
              </a>
            }
          />
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground">
          <span>Java 8 → Java 21 + Spring Boot</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>JS Legado → TypeScript Estrito</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>Python 2 → Python 3.12</span>
        </div>
      </div>
    </section>
  );
}
