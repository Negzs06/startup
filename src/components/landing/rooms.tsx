import Image from "next/image";
import Link from "next/link";
import { Ce3Explainer } from "./ce3-explainer";
import type { Ce3DemoCase, SceneRecords } from "./data";
import { SceneStage } from "./scene-stage";
import { StampLink } from "./stamp-link";
import caseFiled from "../../../public/images/landing/case-filed.webp";
import embosser from "../../../public/images/landing/embosser.webp";
import evidenceSpill from "../../../public/images/landing/evidence-spill.webp";
import receipt from "../../../public/images/landing/receipt.webp";

/*
 * The rooms of the landing page, in scroll order. Rooms with class
 * `room-opaque` cover the fixed 3D stage (the scene idles behind them).
 * `data-*` hooks are read by landing-motion.tsx; nothing here starts hidden.
 */

/** Splits a giant word into letters so the zoom can target one stem. */
function GiantWord({ word, zoomIndex, className }: { word: string; zoomIndex: number; className: string }) {
  return (
    <p className={className} aria-hidden="true">
      {word.split("").map((ch, i) => (
        <span key={i} data-zoom-letter={i === zoomIndex || undefined}>
          {ch}
        </span>
      ))}
    </p>
  );
}

export function Hero({ records }: { records: SceneRecords }) {
  const notice = Object.fromEntries(records.notice);
  return (
    <section id="top" className="hero" aria-labelledby="hero-title" data-hero>
      <div className="stage" data-stage>
        <Image src={evidenceSpill} alt="" fill preload sizes="100vw" placeholder="blur" className="stage-photo" />
        <GiantWord word="DISPUTED" zoomIndex={1} className="giant giant-back" />
        <SceneStage records={records} />
        <GiantWord word="DISPUTED" zoomIndex={1} className="giant giant-front" />
      </div>

      <div className="wrap hero-copy">
        <div className="hero-sheet">
          <dl className="record-strip load" style={{ ["--i" as string]: 0 }}>
            <div>
              <dt>Case</dt>
              <dd>{notice.Case}</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>{notice.Network}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{notice.Amount}</dd>
            </div>
            <div>
              <dt>Opened</dt>
              <dd>{notice.Opened}</dd>
            </div>
            <div>
              <dt>Evidence due</dt>
              <dd>{notice["Evidence due"]}</dd>
            </div>
          </dl>
          <h1 id="hero-title" className="hero-title">
            <span className="mask">
              <span className="load" style={{ ["--i" as string]: 1 }}>
                Chargebacks, answered
              </span>
            </span>{" "}
            <span className="mask">
              <span className="load" style={{ ["--i" as string]: 2 }}>
                with the evidence
              </span>
            </span>{" "}
            <span className="mask">
              <span className="load" style={{ ["--i" as string]: 3 }}>
                you already hold.
              </span>
            </span>
          </h1>
          <p className="hero-lead load" style={{ ["--i" as string]: 4 }}>
            A dispute webhook opens a case. ChargeGuard pulls the logins, product usage, tickets and charge history,
            audits them against Visa Compelling Evidence 3.0, has Gemini write the dossier in the issuing bank&apos;s
            language, and files it through the processor. When the merchant is at fault, it says accept.
          </p>
          <div className="hero-actions load" style={{ ["--i" as string]: 5 }}>
            <StampLink href="/dashboard" className="btn btn-vermilion">
              Open the demo case files
            </StampLink>
            <a href="#how-it-works" className="link-rule">
              How a case is built
            </a>
          </div>
          <p className="rec hero-note load" style={{ ["--i" as string]: 6 }}>
            Prototype · fictional demo data · filing is simulated
          </p>
        </div>
      </div>
    </section>
  );
}

const LEDGER = [
  [
    "~$48B",
    "Lost to friendly fraud each year",
    "Each dispute costs the sale, a fee and dispute-ratio headroom, answered or not.",
  ],
  [
    "0.9%",
    "Dispute ratio where monitoring starts",
    "Visa and Mastercard programmes add fines, remediation plans and, in the end, loss of card acceptance.",
  ],
  [
    "<45%",
    "Recovery of template PDFs abroad",
    "Static English letters lose most international disputes. Issuer analysts read their own language.",
  ],
  [
    "120–365",
    "Days of history CE 3.0 asks for",
    "Prior undisputed transactions, matched on IP address or device, reconciled across systems by hand.",
  ],
] as const;

const CODES = [
  "Visa 10.4",
  "Visa 13.1",
  "Mastercard 4837",
  "Mastercard 4853",
  "CE 3.0",
  "VDMP 0.9%",
  "ECP",
  "Stripe",
  "Adyen",
  "Braintree",
  "Evidence due 7–21 days",
];

export function Problem() {
  return (
    <section
      id="problem"
      className="room room-vermilion room-opaque problem"
      aria-labelledby="problem-title"
      data-room="problem"
    >
      <div className="wrap problem-grid">
        <p className="rec exhibit">Exhibit A · the cost of not answering</p>
        <h2 id="problem-title" className="sr-only">
          The problem
        </h2>
        <p className="numeral" data-count="70" data-count-suffix="%+">
          70%+
        </p>
        <p className="problem-lede split">
          of digital chargebacks are first-party fraud. The cardholder logged in, used the product, and disputed the
          charge anyway.
        </p>
        <dl className="ledger">
          {LEDGER.map(([value, title, body]) => (
            <div key={title} className="ledger-row">
              <dt>
                <span className="ledger-value">{value}</span>
                <span className="ledger-title">{title}</span>
              </dt>
              <dd>{body}</dd>
            </div>
          ))}
        </dl>
        <p className="rec problem-source">Industry estimates; figures vary by source and segment.</p>
      </div>
      <div className="receipt-cut" aria-hidden="true" data-receipt>
        <Image src={receipt} alt="" sizes="(min-width: 1024px) 14vw, 30vw" />
      </div>
      <div className="marquee" aria-hidden="true" data-marquee>
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <span key={k} className="marquee-run">
              {CODES.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    id: "webhook",
    label: "Webhook",
    title: "The processor reports a dispute.",
    body: "Stripe sends charge.dispute.created. ChargeGuard checks the signature, maps the reason to the network code and starts the clock against the evidence deadline.",
    record: "charge.dispute.created → Visa 10.4 · EUR 149.00 · due 07 Nov 2026",
    note: "Stripe signatures are verified today. Adyen and Braintree are planned.",
  },
  {
    id: "records",
    label: "Records",
    title: "Everything tied to the cardholder goes on the table.",
    body: "Logins and device IDs, product usage after the charge, support tickets, prior charges and the Terms of Service the customer accepted.",
    record: "Auth0 · PostHog · Zendesk · Stripe charge history",
    note: "In this prototype the records come from demo case files; live connectors are not built.",
  },
  {
    id: "audit",
    label: "CE 3.0 audit",
    title: "Eligibility is computed, not guessed.",
    body: "At least two prior undisputed transactions, 120 to 365 days older than the disputed one, each sharing the IP address or device plus one more element. Refund requests are checked against the refund window.",
    record: "CG-1041 · 3 qualifying prior transactions · CE 3.0 met",
    note: "Deterministic and unit-tested; a simplified reading of the Visa rules.",
  },
  {
    id: "dossier",
    label: "Dossier",
    title: "Gemini writes the case in the issuer's language.",
    body: "A verdict, a dated timeline, the contract clauses that apply and a cover letter for Nordhafen Bank AG in German. Every citation is checked against the source records first.",
    record: "Timeline · ToS 7.3, 9.1 · Cover letter (de)",
    note: "Schema-validated output; customer text is treated as untrusted input.",
  },
  {
    id: "verdict",
    label: "Verdict",
    title: "Contest, with the seal on the file.",
    body: "The dossier gets its verdict. CG-1041 is contested: CE 3.0 met, MFA login from a known device, four sessions after the charge.",
    record: "CG-1041 · Contest · high confidence",
    note: "If a model call fails, a rule-based dossier is used and labelled as such.",
  },
] as const;

export function Pipeline() {
  return (
    <section id="how-it-works" className="pipeline" aria-labelledby="pipeline-title" data-pipeline>
      <div className="pipeline-sticky">
        <div className="wrap pipeline-grid">
          <div className="pipeline-head">
            <h2 id="pipeline-title" className="h2 split">
              How a case is built
            </h2>
            <p className="flip rec" aria-hidden="true">
              Step{" "}
              <span className="flip-digit" data-flip>
                01
              </span>{" "}
              / 05
            </p>
          </div>
          <ol className="pipeline-form" aria-label="Pipeline steps">
            {STEPS.map((s, i) => (
              <li key={s.id} data-rail={i}>
                <span className="rec">{String(i + 1).padStart(2, "0")}</span>
                <span>{s.label}</span>
              </li>
            ))}
          </ol>
          <div className="pipeline-copy">
            {STEPS.map((s, i) => (
              <article key={s.id} className="pipeline-step" data-step={i} aria-labelledby={`step-${s.id}`}>
                <h3 id={`step-${s.id}`} className="h3">
                  <span className="rec step-no">{String(i + 1).padStart(2, "0")}</span> {s.title}
                </h3>
                <p className="body">{s.body}</p>
                <p className="rec step-record">{s.record}</p>
                <p className="small">{s.note}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Ce3Room({ cases }: { cases: Ce3DemoCase[] }) {
  return (
    <section id="ce3" className="room room-ink room-opaque ce3-room" aria-labelledby="ce3-title" data-room="ce3">
      <div className="wrap">
        <div className="ce3-intro">
          <h2 id="ce3-title" className="h2 split">
            Compelling Evidence 3.0, on the record.
          </h2>
          <p className="body">
            Visa reverses a 10.4 fraud dispute when the cardholder has a history with you: two or more undisputed
            transactions 120 to 365 days before the disputed one, each matching it on at least two data elements, one of
            them the IP address or device ID. Pick a case and a transaction. The audit below runs ChargeGuard&apos;s own
            engine in your browser.
          </p>
          <p className="rec small">
            Demo data: fictional cases CG-1041 and CG-1045. Simplified reading of the Visa rules.
          </p>
        </div>
        <Ce3Explainer cases={cases} />
      </div>
    </section>
  );
}

export function Verdict() {
  return (
    <section
      id="verdict"
      className="room room-paper room-opaque verdict"
      aria-labelledby="verdict-title"
      data-room="verdict"
    >
      <div className="verdict-art" aria-hidden="true">
        <p className="giant giant-verdict">ACCEPT</p>
        <div className="verdict-press">
          <Image src={embosser} alt="" sizes="(min-width: 1024px) 34vw, 70vw" />
        </div>
        <p className="giant giant-verdict giant-outline">ACCEPT</p>
      </div>
      <div className="wrap verdict-grid">
        <h2 id="verdict-title" className="h2 split">
          Contest. Or accept.
        </h2>
        <p className="body verdict-lede">
          Winning is not fighting everything. When the merchant missed a refund request inside its own policy window, a
          rule in code overrides any &ldquo;contest&rdquo; from the model and the recommendation is to accept.
        </p>
        <table className="verdict-ledger">
          <caption className="rec">Demo cases · fictional</caption>
          <thead>
            <tr>
              <th scope="col">Case</th>
              <th scope="col">Network</th>
              <th scope="col">Amount</th>
              <th scope="col">Findings</th>
              <th scope="col">Verdict</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">CG-1041</th>
              <td>Visa 10.4</td>
              <td>EUR 149.00</td>
              <td>CE 3.0 met · password + TOTP from a known device · 4 sessions after the charge</td>
              <td>
                <span className="mark mark-verified">Contest</span>
              </td>
            </tr>
            <tr>
              <th scope="row">CG-1044</th>
              <td>Mastercard 4853</td>
              <td>EUR 348.00</td>
              <td>Refund asked 3 days after the annual renewal, inside the 14-day window, never answered</td>
              <td>
                <span className="mark mark-vermilion">Accept</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function Filed() {
  return (
    <section id="filed" className="filed" aria-labelledby="filed-title" data-filed>
      <div className="filed-photo" aria-hidden="true">
        <Image src={caseFiled} alt="" fill sizes="100vw" />
      </div>
      <div className="wrap filed-grid">
        <h2 id="filed-title" className="giant-sm split">
          Filed.
        </h2>
        <div className="filed-copy">
          <p className="body">
            The sealed dossier maps onto the processor&apos;s evidence fields and goes out through its Dispute API, well
            inside the 7 to 21 day response window. Deadlines are tracked per network; every case keeps its audit trail.
          </p>
          <p className="rec filed-target">
            <span className="mark mark-ink">Target</span> under 60 minutes from webhook to submission. In this prototype
            submission is simulated: no processor API is called.
          </p>
        </div>
      </div>
    </section>
  );
}

const MEMO = [
  [
    "Reads the whole record",
    "Months of session logs, every ticket and the full Terms of Service in one pass, with no summarising before the reasoning starts.",
  ],
  [
    "Argues against the network rule",
    "Evidence is mapped to the requirements of the reason code: Visa 10.4 and 13.1, Mastercard 4837 and 4853.",
  ],
  [
    "Writes in the issuer's language",
    "The cover letter goes out in German, Portuguese, Japanese or French, with an English copy for the merchant.",
  ],
  [
    "Is checked before it is shown",
    "Output is schema-validated. Cited records and quoted clauses must exist. CE 3.0 and timestamps come from code, not from the model.",
  ],
] as const;

export function WhyGemini() {
  return (
    <section id="why-gemini" className="room room-paper room-opaque memo" aria-labelledby="memo-title" data-room="memo">
      <div className="wrap memo-grid">
        <div className="memo-head">
          <p className="rec">Memo · re: why a language model, and why Gemini</p>
          <h2 id="memo-title" className="h2 split">
            Judgment where it helps. Code where it must be exact.
          </h2>
        </div>
        <ol className="memo-list">
          {MEMO.map(([title, body], i) => (
            <li key={title}>
              <span className="rec memo-no">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="h4">{title}</h3>
              <p className="body">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Targets() {
  return (
    <section
      id="targets"
      className="room room-ink room-opaque targets"
      aria-labelledby="targets-title"
      data-room="targets"
    >
      <div className="wrap">
        <h2 id="targets-title" className="h2 split">
          Targets for the first twelve months.
        </h2>
        <p className="rec small">Goals, not results. Nothing here has been measured on live merchant disputes.</p>
        <div className="targets-grid">
          <div className="target">
            <span className="mark mark-paper">Target</span>
            <p className="target-value" data-count="70" data-count-prefix=">" data-count-suffix="%">
              &gt;70%
            </p>
            <p className="target-label">Win rate</p>
            <p className="rec small">Industry average 40–45%</p>
          </div>
          <div className="target">
            <span className="mark mark-paper">Target</span>
            <p className="target-value" data-count="60" data-count-prefix="<" data-count-suffix="min">
              &lt;60min
            </p>
            <p className="target-label">Webhook to submission</p>
            <p className="rec small">Network windows 7–21 days</p>
          </div>
        </div>
        <p className="body targets-segment">
          First segment: B2B SaaS with $1M to $20M ARR and a meaningful share of international cardholders.
        </p>
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section
      id="pricing"
      className="room room-paper room-opaque pricing"
      aria-labelledby="pricing-title"
      data-room="pricing"
    >
      <div className="wrap">
        <h2 id="pricing-title" className="h2 split">
          Paid from what is recovered.
        </h2>
        <table className="price-ledger">
          <caption className="sr-only">Pricing plans</caption>
          <thead>
            <tr>
              <th scope="col">Plan</th>
              <th scope="col">Platform fee</th>
              <th scope="col">Success fee</th>
              <th scope="col">For</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Contingency</th>
              <td>None</td>
              <td className="price">15–20%</td>
              <td>
                Pay only when a dispute is won. Rate depends on volume and network mix. Accept recommendations cost
                nothing.
              </td>
            </tr>
            <tr>
              <th scope="row">Hybrid</th>
              <td className="price">$199/mo</td>
              <td className="price">12%</td>
              <td>
                Steady dispute volume. Adds dispute-ratio monitoring against the 0.9% thresholds, priority connector
                onboarding and a monthly evidence review.
              </td>
            </tr>
          </tbody>
        </table>
        <p className="body pricing-note">
          No custody. ChargeGuard is software between your systems and the processor; recovered funds go from the
          network to your processor balance as they do today.
        </p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="room room-vermilion room-opaque cta" aria-labelledby="cta-title" data-room="cta">
      <div className="wrap cta-grid">
        <h2 id="cta-title" className="giant-sm split">
          Open the files.
        </h2>
        <div>
          <p className="body">
            Six fictional disputes across four reason codes and four issuer languages, one of them a case you should
            accept.
          </p>
          <div className="cta-actions">
            <StampLink href="/dashboard" className="btn btn-ink">
              Open the demo dashboard
            </StampLink>
            <Link href="/dashboard/disputes/CG-1041" className="link-rule">
              Go straight to CG-1041
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
