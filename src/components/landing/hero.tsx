import Link from "next/link";
import { ArrowRight, CheckCircle2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-28">
        <div>
          <Badge variant="outline" className="mb-6 bg-background/60 backdrop-blur">
            Autonomous dispute resolution for global SaaS and digital commerce
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Overturn friendly fraud in every issuer&apos;s language. No analyst required.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
            ChargeGuard ingests your product telemetry, support history and Terms of Service, then assembles a
            bank-grade evidence package for each chargeback and files it through your processor — within the hour.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Open the live demo <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
        </div>
        <DossierPreview />
      </div>
    </section>
  );
}

function DossierPreview() {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-lg shadow-primary/5" aria-label="Example dossier summary">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">CG-1041 · Visa 10.4</span>
        <span>Nordhafen Bank AG · DE</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Badge variant="success" className="text-sm">
          <CheckCircle2 /> Contest
        </Badge>
        <span className="text-sm text-muted-foreground">High confidence · €149.00</span>
      </div>
      <ul className="mt-5 space-y-3 text-sm">
        {[
          ["Compelling Evidence 3.0", "3 qualifying prior transactions (IP + device + account)"],
          ["Usage after charge", "4 sessions, CSV export on 9 Oct"],
          ["Authentication", "Password + TOTP MFA, known device"],
          ["Contract", "ToS 7.3 Account security · 9.1 Delivery"],
        ].map(([label, value]) => (
          <li key={label} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-lg bg-muted p-3 text-sm">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Languages className="size-3.5" aria-hidden /> Cover letter · German
        </div>
        <p className="line-clamp-2">
          Lumen Analytics widerspricht dieser Rückbelastung über 149,00 € vom 2. Oktober 2026. Die folgenden
          Aufzeichnungen belegen, dass der Karteninhaber die Zahlung veranlasst und die Leistung genutzt hat.
        </p>
      </div>
    </div>
  );
}
