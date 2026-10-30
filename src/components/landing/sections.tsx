import Link from "next/link";
import { ArrowRight, Check, FileSearch, Globe2, Send, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PROBLEMS = [
  { stat: "70%+", text: "of digital chargebacks are first-party (friendly) fraud, costing merchants over $48B a year." },
  { stat: "0.9%", text: "dispute-rate threshold for Visa and Mastercard monitoring programs, with monthly fines and termination risk." },
  { stat: "120+ days", text: "of history that Visa CE 3.0 needs reconciled - IP, device and login - to reverse a dispute automatically." },
  { stat: "<45%", text: "international recovery rate from template-based PDF generators." },
];

export function ProblemSection() {
  return (
    <section id="problem" className="border-y border-border/60 bg-muted/30 px-6 py-20">
      <div className="mx-auto max-w-[69rem]">
        <h2 className="text-3xl font-semibold tracking-tight">Chargebacks are won on evidence, and nobody has time to assemble it</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((p) => (
            <div key={p.stat}>
              <div className="text-3xl font-semibold text-primary">{p.stat}</div>
              <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Webhook, title: "1. Trigger and ingest", text: "A dispute webhook fires. ChargeGuard pulls the matching records from Auth0, PostHog, Zendesk and your gateway." },
  { icon: FileSearch, title: "2. Forensic synthesis", text: "Claude reads logs, tickets and the full Terms of Service, runs a deterministic CE 3.0 audit, and decides whether to contest or accept." },
  { icon: Globe2, title: "3. Localized dossier", text: "A chronological timeline, highlighted clauses and a cover letter in the card-issuing bank's native language." },
  { icon: Send, title: "4. Automated representment", text: "The package is filed through the processor's Dispute API - well inside the 7-21 day deadline." },
];

export function FlowSection() {
  return (
    <section id="how" className="px-6 py-20">
      <div className="mx-auto max-w-[69rem]">
        <h2 className="text-3xl font-semibold tracking-tight">From webhook to filed evidence in under an hour</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="mb-2 h-6 w-6 text-primary" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-sm text-muted-foreground">
          Claude also knows when not to fight: if the evidence shows the merchant missed a refund inside its own
          policy window, ChargeGuard recommends accepting, protecting your dispute rate.
        </p>
      </div>
    </section>
  );
}

const PLANS = [
  { name: "Contingency", price: "15-20%", detail: "of recovered funds", points: ["No monthly fee", "Pay only when you win", "Zero financial risk"] },
  { name: "Hybrid", price: "$199/mo", detail: "+ 12% success fee", points: ["Lower fee at volume", "Priority queue", "Dedicated onboarding"] },
];

export function PricingSection() {
  return (
    <section id="pricing" className="border-y border-border/60 bg-muted/30 px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-semibold tracking-tight">Priced on outcomes</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <Card key={plan.name}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="text-3xl font-semibold">{plan.price}</div>
                <CardDescription>{plan.detail}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {plan.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" /> {pt}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          ChargeGuard is a software orchestration layer: no custody of funds, no banking or money-transmitter license required.
        </p>
      </div>
    </section>
  );
}

const TARGETS = [
  { value: "> 70%", label: "dispute win rate (industry: 40-45%)" },
  { value: "< 60 min", label: "from webhook to submission" },
  { value: "$1M-$20M", label: "ARR B2B SaaS with international cardholders" },
];

export function MetricsSection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-[69rem]">
        <h2 className="text-3xl font-semibold tracking-tight">MVP-to-12-month targets</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {TARGETS.map((t) => (
            <div key={t.label} className="rounded-xl border p-6">
              <div className="text-3xl font-semibold text-primary">{t.value}</div>
              <p className="mt-2 text-sm text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-3xl rounded-2xl bg-primary px-8 py-14 text-center text-primary-foreground">
        <h2 className="text-3xl font-semibold tracking-tight">See your next dispute handled end to end</h2>
        <p className="mx-auto mt-3 max-w-xl opacity-90">
          Open the dashboard to run the analysis on sample disputes from four card networks and three languages.
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="mt-8 gap-2"
          nativeButton={false}
          render={
            <Link href="/dashboard">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    </section>
  );
}
