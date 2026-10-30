import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/12%,transparent_60%)]"
      />
      <div className="mx-auto max-w-4xl text-center">
        <Badge variant="secondary" className="mb-6 gap-1.5 py-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Powered by Claude · Anthropic
        </Badge>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          An autonomous disputes department that{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            wins back friendly fraud
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          ChargeGuard AI reads your product telemetry, support history and Terms of Service, then files a
          bank-grade evidence package in the issuer&apos;s own language - within hours of the dispute, not days.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="gap-2"
            nativeButton={false}
            render={
              <Link href="/dashboard">
                See a dispute analyzed
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <Button size="lg" variant="outline" nativeButton={false} render={<a href="#how">How it works</a>} />
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground">
          <span>Stripe · Adyen · Braintree</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>Visa 10.4 / 13.1 · Mastercard 4837 / 4853</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>Visa Compelling Evidence 3.0</span>
        </div>
      </div>
    </section>
  );
}
