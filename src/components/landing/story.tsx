import Image from "next/image";
import Link from "next/link";
import fracturedCard from "../../../public/images/landing/fractured-card.webp";

/*
 * The narrative half of the page: threat → crack → evidence assembling →
 * verdict → filing. Sections that let the 3D stage show through carry
 * `data-scene="progress offsetX opacity"` (see scene-stage.tsx).
 */

function Arrow() {
  return (
    <svg className="lp-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="lp-hero" aria-labelledby="hero-title" data-scene="0.12 0.36 1" data-scene-narrow="0.9">
      <div className="lp-wrap">
        <p className="lp-mono lp-eyebrow lp-load-fade" style={{ ["--i" as string]: 0 }}>
          Autonomous chargeback representment
        </p>
        <h1 id="hero-title" className="lp-display lp-hero-title mt-6">
          <span className="lp-line">
            <span className="lp-load" style={{ ["--i" as string]: 0 }}>
              The evidence
            </span>
          </span>{" "}
          <span className="lp-line">
            <span className="lp-load" style={{ ["--i" as string]: 1 }}>
              already exists.
            </span>
          </span>{" "}
          <span className="lp-line">
            <em className="lp-load" style={{ ["--i" as string]: 2 }}>
              We put it on
            </em>
          </span>{" "}
          <span className="lp-line">
            <em className="lp-load" style={{ ["--i" as string]: 3 }}>
              the record.
            </em>
          </span>
        </h1>
        <div className="lp-hero-foot">
          <div className="lp-load-fade" style={{ ["--i" as string]: 1 }}>
            <p className="lp-lead">
              ChargeGuard AI turns a dispute webhook into a bank-grade evidence dossier for SaaS and digital-commerce
              merchants: audited against Visa Compelling Evidence 3.0, argued by Gemini, written in the issuing
              bank&apos;s language. And it tells you when not to fight.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/dashboard" className="lp-btn lp-btn-primary" data-magnetic>
                Explore the demo <Arrow />
              </Link>
              <a href="#how-it-works" className="lp-btn lp-btn-ghost">
                How it works
              </a>
            </div>
            <p className="lp-note mt-5">Prototype. The demo runs on fictional case data.</p>
          </div>
          <p className="lp-mono lp-scroll-cue lp-load-fade" style={{ ["--i" as string]: 3 }} aria-hidden="true">
            <span>Scroll</span>
            <span />
          </p>
        </div>
      </div>
    </section>
  );
}

const FACTS = [
  {
    value: "70%+",
    title: "Friendly fraud is the default",
    body: "Most digital chargebacks are first-party: the cardholder used the product and disputed the charge anyway. Forgotten renewals, shared accounts, buyer's remorse.",
  },
  {
    value: "~$48B",
    title: "Lost every year",
    body: "Each dispute costs the sale, a fee and dispute-ratio headroom, whether or not anyone answers it.",
  },
  {
    value: "0.9%",
    title: "Where monitoring begins",
    body: "Cross the Visa and Mastercard dispute-rate thresholds and you face escalating fines, mandatory remediation and, eventually, the loss of card acceptance.",
  },
  {
    value: "<45%",
    title: "Templates fail across borders",
    body: "Static English PDFs recover under half of international disputes. Issuer analysts in Frankfurt, São Paulo or Tokyo decide on evidence written in their language.",
  },
];

export function Problem() {
  return (
    <section id="problem" className="lp-section lp-room" aria-labelledby="problem-title" data-scene="0.4 0 0">
      <div className="lp-wrap grid gap-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="lp-mono lp-eyebrow">01 · The threat</p>
          <h2 id="problem-title" className="lp-display lp-h2 mt-6 lp-reveal">
            A chargeback is a sale that <em className="lp-ember">cracks</em> weeks later.
          </h2>
          <p className="lp-lead mt-8 lp-reveal">
            The proof that the cardholder used your product already sits in your auth logs, your analytics and your
            help desk. Scattered across systems, in the wrong format, in the wrong language, with a deadline running.
            Visa Compelling Evidence 3.0 can reverse a dispute outright, but only with prior transactions from 120 to
            365 days back, matched on IP address, device and account.
          </p>
          <figure className="lp-problem-art lp-parallax mt-12">
            <Image src={fracturedCard} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" placeholder="blur" />
          </figure>
        </div>
        <div>
          <dl className="lp-facts">
            {FACTS.map((fact) => (
              <div key={fact.value} className="lp-fact lp-reveal">
                <dt>{fact.value}</dt>
                <dd>
                  <h3>{fact.title}</h3>
                  <p className="lp-body">{fact.body}</p>
                </dd>
              </div>
            ))}
          </dl>
          <p className="lp-note mt-6">Industry estimates; figures vary by source and segment.</p>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    id: "trigger",
    label: "Trigger",
    title: "A dispute webhook opens the case.",
    body: "Stripe, Adyen or Braintree reports the dispute. ChargeGuard verifies the signature, maps the processor's reason to the network reason code and starts the clock against the response deadline.",
    detail: ["Stripe signature verification is implemented", "Adyen and Braintree are planned"],
    artifact: (
      <dl className="grid gap-0.5">
        {[
          ["event", "charge.dispute.created"],
          ["reason", "fraudulent → Visa 10.4"],
          ["amount", "€149.00"],
          ["issuer", "Nordhafen Bank AG · DE"],
          ["case", "CG-1041 opened"],
        ].map(([k, v]) => (
          <div key={k} className="lp-artifact-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    ),
  },
  {
    id: "gather",
    label: "Gather",
    title: "Every record tied to the cardholder.",
    body: "Logins and device fingerprints, product usage after the charge, every support ticket, the charge history and the Terms of Service the customer accepted, pulled into one case file.",
    detail: ["Auth0 logins and devices", "PostHog product usage", "Zendesk tickets · Stripe charge history", "In this prototype these come from demo case files; live connectors are not built yet"],
    artifact: (
      <ul className="grid gap-0.5">
        <li className="lp-check">Login · password + TOTP, known device</li>
        <li className="lp-check">4 sessions after the charge, CSV export on 9 Oct</li>
        <li className="lp-check">6 prior charges, none disputed</li>
        <li className="lp-check">ToS 7.3 Account security · 9.1 Delivery</li>
      </ul>
    ),
  },
  {
    id: "audit",
    label: "Audit",
    title: "Compelling Evidence 3.0, computed. Not guessed.",
    body: "Eligibility is decided in code, not by the model: at least two prior undisputed transactions 120 to 365 days older than the disputed one, each sharing the IP address or device plus a second data element. Refund requests are checked against the merchant's own refund window.",
    detail: ["Deterministic and unit-tested", "A simplified reading of the rules, to be verified against current Visa rules before real filing"],
    artifact: (
      <ul className="grid gap-0.5">
        <li className="lp-check">Visa 10.4: CE 3.0 applies</li>
        <li className="lp-check">3 qualifying prior transactions</li>
        <li className="lp-check">Matched on IP + device + account</li>
        <li className="lp-check" data-state="info">
          No refund request in the support history
        </li>
      </ul>
    ),
  },
  {
    id: "argue",
    label: "Argue",
    title: "Gemini writes the case, in the issuer's language.",
    body: "Gemini reads the whole record and returns a verdict, a chronological timeline, highlighted contract clauses and a cover letter in the issuing bank's language. Every citation is checked against the source records before anything is shown.",
    detail: ["Schema-validated output, grounded citations", "Customer text treated as untrusted input", "Falls back to a rule-based dossier, labelled as such"],
    artifact: (
      <p lang="de" className="text-(--lp-paper)">
        <span className="lp-mono mb-2 block text-(--lp-faint)" lang="en">
          Cover letter · German
        </span>
        Lumen Analytics widerspricht dieser Rückbelastung über 149,00 € vom 2. Oktober 2026. Die folgenden
        Aufzeichnungen belegen, dass der Karteninhaber die Zahlung veranlasst und die Leistung genutzt hat.
      </p>
    ),
  },
] as const;

const STEP_SCENE = ["0.6 -0.24 1", "0.9 -0.24 1", "1.2 -0.24 1", "1.6 -0.22 1"];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="lp-section" aria-labelledby="how-title">
      <div className="lp-wrap">
        <div className="max-w-3xl" data-scene="0.5 -0.24 0.85" data-scene-narrow="0.5">
          <p className="lp-mono lp-eyebrow">02 · How it works</p>
          <h2 id="how-title" className="lp-display lp-h2 mt-6 lp-reveal">
            From webhook to <em>dossier</em>, without an analyst.
          </h2>
          <p className="lp-lead mt-8 lp-reveal">
            Four steps, each one leaving a record. Scattered fragments become strands of evidence; the strands close
            into a case you can file.
          </p>
        </div>
        <div className="lp-pipeline mt-10" data-pipeline>
          <ol className="lp-rail lp-mono" aria-label="Pipeline progress">
            {STEPS.map((step, i) => (
              <li key={step.id} data-rail-step={step.id}>
                {String(i + 1).padStart(2, "0")} {step.label}
              </li>
            ))}
          </ol>
          <ol className="lp-steps">
            {STEPS.map((step, i) => (
              <li key={step.id} className="lp-step" data-step={step.id} data-scene={STEP_SCENE[i]} data-scene-narrow="0.4">
                <article className="lp-step-card" aria-labelledby={`step-${step.id}`}>
                  <p className="lp-mono lp-step-num">
                    {String(i + 1).padStart(2, "0")} / {step.label}
                  </p>
                  <h3 id={`step-${step.id}`} className="lp-display lp-h3 mt-4">
                    {step.title}
                  </h3>
                  <p className="lp-body mt-4">{step.body}</p>
                  <div className="lp-artifact">{step.artifact}</div>
                  <ul className="lp-detail">
                    {step.detail.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function Verdict() {
  return (
    <section id="verdict" className="lp-section" aria-labelledby="verdict-title" data-scene="2 0.24 1" data-scene-narrow="0.35">
      <div className="lp-wrap">
        <div className="lg:max-w-[52%]">
          <p className="lp-mono lp-eyebrow">03 · The verdict</p>
          <h2 id="verdict-title" className="lp-display lp-h2 mt-6 lp-reveal">
            Contest, or <em className="lp-ember">accept</em>.
          </h2>
          <p className="lp-lead mt-8 lp-reveal">
            Winning is not fighting everything. When the evidence shows the merchant missed a refund request inside
            its own policy window, ChargeGuard recommends accepting the dispute, sparing a fight it should not
            win.
          </p>
          <div className="lp-verdict-grid">
            <article className="lp-case lp-reveal" data-verdict="contest" aria-labelledby="case-1041">
              <h3 id="case-1041" className="lp-mono font-normal text-(--lp-muted)">
                CG-1041 · Visa 10.4 · €149.00
              </h3>
              <p className="lp-case-verdict">Contest</p>
              <p className="lp-note mt-1">High confidence</p>
              <ul>
                <li>CE 3.0 met: three qualifying prior transactions</li>
                <li>Password + TOTP login from a known device</li>
                <li>Four sessions and a CSV export after the charge</li>
              </ul>
            </article>
            <article className="lp-case lp-reveal" data-verdict="accept" aria-labelledby="case-1044">
              <h3 id="case-1044" className="lp-mono font-normal text-(--lp-muted)">
                CG-1044 · Mastercard 4853 · €348.00
              </h3>
              <p className="lp-case-verdict">Accept</p>
              <p className="lp-note mt-1">Merchant at fault</p>
              <ul>
                <li>Refund requested 3 days after the annual renewal</li>
                <li>Inside the 14-day refund window, never answered</li>
                <li>A code rule overrides any “contest” from the model here</li>
              </ul>
            </article>
          </div>
          <p className="lp-note mt-4">Fictional cases from the demo data set.</p>
        </div>
      </div>
    </section>
  );
}

export function Filing() {
  return (
    <section id="filing" className="lp-section" aria-labelledby="filing-title" data-scene="3 0 1" data-scene-narrow="0.35">
      <div className="lp-wrap">
        <div className="max-w-3xl">
          <p className="lp-mono lp-eyebrow">04 · Filing</p>
          <h2 id="filing-title" className="lp-display lp-h2 mt-6 lp-reveal">
            Filed through the processor&apos;s Dispute API, <em>inside the hour</em>.
          </h2>
        </div>
        <div className="lp-filing-line" aria-hidden="true" />
        <div className="grid gap-10 md:grid-cols-3">
          <p className="lp-body lp-reveal">
            The finished package maps onto the processor&apos;s native evidence fields, well inside the 7 to 21 day
            response windows.
          </p>
          <p className="lp-body lp-reveal">Deadlines are tracked per network, and every case keeps a full audit trail.</p>
          <p className="lp-body lp-reveal">
            <span className="lp-tag lp-mono mb-3">Target · not yet live</span>
            <br />
            Under 60 minutes from webhook to submission is a target. In this prototype submission is simulated: no
            processor API is called.
          </p>
        </div>
      </div>
    </section>
  );
}
