import Image from "next/image";
import Link from "next/link";
import vellumDossier from "../../../public/images/landing/vellum-dossier.webp";

const WHY = [
  {
    n: "i",
    title: "Reads the whole record",
    body: "Months of session logs, every ticket and the full Terms of Service fit in a single pass, with no lossy summarisation before the reasoning starts.",
  },
  {
    n: "ii",
    title: "Reasons over network rules",
    body: "Maps evidence to the requirements of each reason code (Visa 10.4 and 13.1, Mastercard 4837 and 4853) and says when the merchant is at fault.",
  },
  {
    n: "iii",
    title: "Writes like a local",
    body: "Produces the cover letter in the issuing bank's language, alongside an English version for your records.",
  },
  {
    n: "iv",
    title: "Grounded and guarded",
    body: "Schema-validated output. Every cited record and quoted clause is checked against source data; CE 3.0 is computed in code; customer text is treated as untrusted.",
  },
];

export function WhyGemini() {
  return (
    <section id="why-gemini" className="lp-section lp-room lp-rule-top" aria-labelledby="why-title" data-scene="3 0 0">
      <div className="lp-wrap grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div>
          <p className="lp-mono lp-eyebrow">Why Gemini</p>
          <h2 id="why-title" className="lp-display lp-h2 mt-6 lp-reveal">
            Judgment where it matters. <em>Determinism</em> where it must be exact.
          </h2>
          <p className="lp-lead mt-8 lp-reveal">
            Gemini does what templates cannot: read messy, multilingual evidence and argue it the way an experienced
            dispute analyst would. Everything that can be computed (eligibility windows, data-element matches,
            timestamps) is computed in code and handed to the model as fact.
          </p>
        </div>
        <div className="lp-grid-2 self-end">
          {WHY.map((item) => (
            <div key={item.title} className="lp-cell lp-reveal">
              <p className="lp-display text-2xl text-(--lp-seal) italic" aria-hidden="true">
                {item.n}
              </p>
              <h3>{item.title}</h3>
              <p className="lp-body mt-2 text-[0.95rem]">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TARGETS = [
  { value: ">70%", label: "Win rate", note: "Industry average: 40–45%" },
  { value: "<60", unit: "min", label: "Webhook to submission", note: "Network response windows: 7–21 days" },
  { value: "$1–20M", label: "ARR, B2B SaaS", note: "First segment: significant international cardholder volume" },
];

export function Targets() {
  return (
    <section id="targets" className="lp-section lp-room-raised" aria-labelledby="targets-title">
      <div className="lp-wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="lp-mono lp-eyebrow">Targets</p>
            <h2 id="targets-title" className="lp-display lp-h2 mt-6 lp-reveal">
              What we hold <em>ourselves</em> to.
            </h2>
          </div>
          <p className="lp-note max-w-sm">
            Goals for the first twelve months, not results. Nothing here has been measured on live merchant disputes.
          </p>
        </div>
        <div className="lp-targets">
          {TARGETS.map((t) => (
            <div key={t.label} className="lp-target lp-reveal">
              <span className="lp-tag lp-mono">Target</span>
              <p className="lp-target-value">
                {t.value}
                {t.unit ? <span className="ml-2 text-[0.4em] tracking-normal text-(--lp-muted)">{t.unit}</span> : null}
              </p>
              <p className="mt-4 font-medium">{t.label}</p>
              <p className="lp-note mt-1">{t.note}</p>
            </div>
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
    body: "Pay only when a dispute is won. The rate depends on volume and network mix.",
    features: ["No platform fee", "All supported reason codes", "Localized cover letters", "Accept recommendations at no charge"],
  },
  {
    name: "Hybrid",
    price: "$199",
    unit: "per month + 12% of recovered funds",
    body: "A lower success fee for merchants with steady dispute volume.",
    features: [
      "Everything in Contingency",
      "Dispute-ratio monitoring against the 0.9% thresholds",
      "Priority connector onboarding",
      "Monthly evidence-quality review",
    ],
    featured: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="lp-section lp-room lp-rule-top" aria-labelledby="pricing-title">
      <div className="lp-wrap">
        <p className="lp-mono lp-eyebrow">Pricing</p>
        <h2 id="pricing-title" className="lp-display lp-h2 mt-6 max-w-4xl lp-reveal">
          Aligned with your <em>recovery</em>, not your dispute count.
        </h2>
        <div className="lp-plans">
          {PLANS.map((plan) => (
            <article key={plan.name} className="lp-plan lp-reveal" data-featured={plan.featured || undefined} aria-labelledby={`plan-${plan.name}`}>
              <div className="flex items-center justify-between gap-4">
                <h3 id={`plan-${plan.name}`} className="text-lg font-semibold">
                  {plan.name}
                </h3>
                {plan.featured ? <span className="lp-tag lp-mono">Steady volume</span> : null}
              </div>
              <p className="lp-body mt-2">{plan.body}</p>
              <p className="lp-plan-price">{plan.price}</p>
              <p className="mt-2 text-(--lp-muted)">{plan.unit}</p>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="mt-8 grid gap-2 border-l border-(--lp-seal-deep) pl-5 md:max-w-3xl">
          <p className="font-medium">Zero custodial risk.</p>
          <p className="lp-body">
            ChargeGuard is a software orchestration layer. Recovered funds flow from the network to your processor
            balance as they do today; we never hold or move money.
          </p>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="lp-section lp-room lp-cta lp-rule-top" aria-labelledby="cta-title">
      <div className="lp-cta-art lp-parallax" aria-hidden="true">
        <Image src={vellumDossier} alt="" fill sizes="100vw" placeholder="blur" />
      </div>
      <div className="lp-wrap">
        <div className="max-w-2xl py-[6vh]">
          <h2 id="cta-title" className="lp-display lp-h2 lp-reveal">
            See a dossier <em>being built</em>.
          </h2>
          <p className="lp-lead mt-8">
            Six fictional disputes across four reason codes and four issuer languages, including one you should accept.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/dashboard" className="lp-btn lp-btn-primary" data-magnetic>
              Open the demo dashboard
              <svg className="lp-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
