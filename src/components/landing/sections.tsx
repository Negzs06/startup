import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpenText,
  Clock,
  FileSearch,
  Gauge,
  Globe2,
  Languages,
  Lock,
  Scale,
  Send,
  ShieldAlert,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{title}</h2>
      {children ? <p className="mt-4 text-pretty text-muted-foreground">{children}</p> : null}
    </div>
  );
}

const STATS = [
  { value: "70%+", label: "of digital chargebacks are first-party (“friendly”) fraud" },
  { value: "~$48B", label: "lost to friendly fraud every year" },
  { value: "0.9%", label: "dispute ratio that triggers Visa / Mastercard monitoring" },
  { value: "<45%", label: "recovery rate of template PDF engines on international disputes" },
];

export function StatsBand() {
  return (
    <section className="border-b bg-muted/40">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-12 sm:px-6 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.value}>
            <dt className="sr-only">{s.label}</dt>
            <dd className="text-3xl font-semibold tracking-tight">{s.value}</dd>
            <dd className="mt-1 text-sm text-muted-foreground">{s.label}</dd>
          </div>
        ))}
      </dl>
      <p className="mx-auto max-w-6xl px-4 pb-6 text-xs text-muted-foreground sm:px-6">Industry estimates; figures vary by source and segment.</p>
    </section>
  );
}

const PROBLEMS = [
  {
    icon: ShieldAlert,
    title: "Friendly fraud is the default",
    body: "Cardholders who used the product dispute the charge anyway — forgotten renewals, shared accounts, buyer's remorse. Each one costs the sale, a fee and dispute-ratio headroom.",
  },
  {
    icon: AlertTriangle,
    title: "Monitoring programs bite at 0.9%",
    body: "Cross the VDMP / ECP thresholds and you face escalating fines, mandatory remediation and, eventually, the loss of card acceptance.",
  },
  {
    icon: FileSearch,
    title: "CE 3.0 demands reconciled history",
    body: "Visa Compelling Evidence 3.0 needs prior undisputed transactions from 120+ days back, matched on IP, device fingerprint and login — data scattered across four systems.",
  },
  {
    icon: Globe2,
    title: "Templates fail across borders",
    body: "Generic English PDFs recover under 45% internationally. Issuer analysts in Frankfurt, São Paulo or Tokyo decide faster on evidence written in their language.",
  },
];

export function Problem() {
  return (
    <section id="problem" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="The problem" title="Chargebacks are an evidence problem, not a payments problem">
        The proof that a cardholder used your product already exists — in your auth logs, analytics and help desk.
        Nobody has time to assemble it, reconcile it against network rules and translate it before the deadline.
      </SectionHeading>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {PROBLEMS.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="mb-2 size-5 text-primary" aria-hidden />
              <CardTitle>{title}</CardTitle>
              <CardDescription className="leading-relaxed">{body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: Webhook,
    step: "a",
    title: "Trigger & ingestion",
    body: "A dispute webhook from Stripe, Adyen or Braintree opens a case. ChargeGuard queries your connected systems for everything tied to the cardholder.",
    detail: ["Stripe, Adyen, Braintree webhooks", "Auth0 logins & device fingerprints", "PostHog product usage", "Zendesk tickets · Stripe charge history"],
  },
  {
    icon: Scale,
    step: "b",
    title: "Forensic synthesis with Gemini",
    body: "Gemini reads session logs, chat transcripts and your full Terms of Service, evaluates them against the network rule for the reason code and decides whether to contest or accept.",
    detail: ["Visa 10.4 · 13.1, Mastercard 4837 · 4853", "Deterministic CE 3.0 audit of transaction history", "Chronological dossier + highlighted contract clauses", "Cover letter in the issuing bank's language"],
  },
  {
    icon: Send,
    step: "c",
    title: "Automated representment",
    body: "The finished package is submitted through the processor's Dispute API within hours — well inside the 7–21 day response windows.",
    detail: ["Processor-native evidence fields", "Deadline tracking per network", "Accepts disputes you should not fight", "Full audit trail per case"],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="How it works" title="From webhook to filed evidence, with zero human intervention" />
        <ol className="mt-10 grid gap-4 lg:grid-cols-3">
          {STEPS.map(({ icon: Icon, step, title, body, detail }) => (
            <li key={step}>
              <Card className="h-full">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{step}</span>
                    <Icon className="size-5 text-primary" aria-hidden />
                  </div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription className="leading-relaxed">{body}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <ul className="space-y-1.5 text-sm">
                    {detail.map((d) => (
                      <li key={d} className="flex gap-2">
                        <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const WHY = [
  { icon: BookOpenText, title: "Reads the whole record", body: "Months of session logs, every ticket and the full Terms of Service fit in a single pass — no lossy summarisation before the reasoning starts." },
  { icon: Scale, title: "Reasons over network rules", body: "Maps evidence to the specific requirements of each reason code, and says when the merchant is at fault and the dispute should be accepted." },
  { icon: Languages, title: "Writes like a local", body: "Produces the cover letter in the issuing bank's native language, alongside an English version for your records." },
  { icon: Lock, title: "Grounded and guarded", body: "Structured, schema-validated output. Every cited record and quoted clause is checked against source data; CE 3.0 is computed deterministically; customer text is treated as untrusted." },
];

export function WhyGemini() {
  return (
    <section id="why-gemini" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="Why Gemini" title="Judgment where it matters, determinism where it must be exact">
        Gemini does what templates cannot: read messy, multilingual evidence and argue it the way an experienced
        dispute analyst would. Everything that can be computed — eligibility windows, data-element matches,
        timestamps — is computed in code and handed to Gemini as fact.
      </SectionHeading>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {WHY.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4 rounded-xl border p-5">
            <Icon className="size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const TARGETS = [
  { icon: BadgeCheck, value: ">70%", label: "target win rate", note: "Industry average: 40–45%" },
  { icon: Clock, value: "<60 min", label: "target time to submission", note: "Network windows: 7–21 days" },
  { icon: Gauge, value: "$1M–$20M", label: "ARR, B2B SaaS", note: "With significant international cardholder volume" },
];

export function Targets() {
  return (
    <section id="targets" className="border-y bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="Targets" title="What we hold ourselves to" />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {TARGETS.map(({ icon: Icon, value, label, note }) => (
            <Card key={label}>
              <CardContent>
                <Icon className="size-5 text-primary" aria-hidden />
                <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
                <p className="mt-1 font-medium">{label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{note}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  {
    name: "Contingency",
    price: "15–20%",
    unit: "of recovered funds",
    body: "Pay only when we win. Rate depends on volume and network mix.",
    features: ["No platform fee", "All supported reason codes", "Localized cover letters", "Accept recommendations at no charge"],
  },
  {
    name: "Hybrid",
    price: "$199/mo",
    unit: "+ 12% of recovered funds",
    body: "Lower success fee for merchants with steady dispute volume.",
    features: ["Everything in Contingency", "Dispute-ratio monitoring vs. 0.9% thresholds", "Priority connector onboarding", "Monthly evidence-quality review"],
    featured: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="Pricing" title="Aligned with your recovery, not your dispute count" />
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {PLANS.map((plan) => (
          <Card key={plan.name} className={plan.featured ? "border-primary ring-1 ring-primary" : undefined}>
            <CardHeader>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <CardDescription>{plan.body}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>{" "}
                <span className="text-muted-foreground">{plan.unit}</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <BadgeCheck className="size-4 shrink-0 text-primary" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex gap-3 rounded-xl border bg-muted/40 p-5 text-sm">
        <Banknote className="size-5 shrink-0 text-primary" aria-hidden />
        <p>
          <span className="font-medium">Zero custodial risk.</span>{" "}
          <span className="text-muted-foreground">
            ChargeGuard is a software orchestration layer. Recovered funds flow from the network to your processor
            balance as they do today; we never hold or move money.
          </span>
        </p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">See a dossier being built</h2>
          <p className="mt-2 text-muted-foreground">Six demo disputes across four reason codes and four issuer languages — including one you should accept.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard">
            Open the dashboard <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
