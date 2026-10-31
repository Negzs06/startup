# ChargeGuard AI

Prototype of autonomous chargeback representment for SaaS and digital commerce.
A dispute webhook opens a case; ChargeGuard audits the transaction history
(Visa Compelling Evidence 3.0), asks Gemini to build the evidence dossier —
verdict, chronological timeline, highlighted Terms of Service clauses and a
cover letter in the issuing bank's language — and (eventually) files it through
the processor's Dispute API.

Stack: Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4,
shadcn/ui-style components on Radix, the Google Gen AI SDK (`@google/genai`) and zod.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000 — landing page; /dashboard for the app
npm test             # unit tests (node:test via tsx)
npm run typecheck    # next typegen + tsc
npm run lint
npm run build
```

With no configuration the app runs on demo data and a rule-based dossier.
Copy `.env.example` to `.env.local` to enable the rest:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Enables the Gemini analysis in `POST /api/disputes/[id]/analyze` (create a key in Google AI Studio). Without it the route returns the rule-based dossier and says why. |
| `GEMINI_MODEL` | Optional model override. Defaults to `gemini-3.5-flash`; Gemini model IDs change often, so confirm it against the models your key can use. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `POST /api/webhooks/stripe`. The route returns 503 without it. |

## What is real and what is a stub

**Real and tested**

- **Visa CE 3.0 audit** (`src/lib/ce3/audit.ts`) — deterministic and unit-tested.
  It is a *simplified reading* that must be verified against the current Visa
  rules before real evidence is filed: Visa 10.4 only; at least two prior
  transactions that were never disputed and are 120–365 days older than the
  disputed one (both bounds inclusive); each sharing at least two of IP
  address, device ID, account ID and shipping address with the disputed
  transaction, one of which must be the IP address or device ID.
- **Stripe webhook** (`src/lib/stripe/webhook.ts`, `src/app/api/webhooks/stripe`) —
  real `Stripe-Signature` verification (HMAC-SHA256 over `t.payload`, 300 s
  timestamp tolerance, constant-time comparison, multiple `v1` signatures
  accepted for secret rotation) and normalization of `charge.dispute.created`
  into a dispute record. The network reason code is taken from Stripe when it
  is passed through, otherwise inferred from Stripe's reason and marked
  `inferred`; unsupported codes are left unmapped.
- **Gemini analysis** (`src/lib/analysis/`) — one `generateContent` call in
  JSON mode, with the response schema derived from the zod schema that
  validates the reply. The pipeline:
  - CE 3.0 and other deterministic signals (refund requests vs. the refund
    window, usage after the charge, known-device and strong-auth logins) are
    computed in code and given to the model as facts.
  - The cardholder claim and support tickets go into a separate
    `<untrusted_customer_content>` block with `<` and `>` escaped; the system
    prompt tells the model to treat it as data and report instruction-like text.
    Demo case CG-1046 contains such an injection attempt.
  - The stop reason is checked before reading output: blocked prompts and
    safety finish reasons count as refusals, and token-limit truncation raises
    an error, as do missing, non-JSON or schema-invalid output.
  - The output is then **grounded** (`ground.ts`): timeline entries and
    citations must reference real records (timestamps come from the record,
    not the model), clauses must exist, highlights must be verbatim quotes,
    and a contest verdict is overridden to *accept* when the merchant-fault
    rule fires (an unanswered refund request inside the refund window).
  - Any failure — or a missing API key — falls back to the rule-based
    dossier, which the UI labels clearly along with the reason.

**Stubbed / not built**

- **No database.** Demo case files live in `src/lib/demo/`. Verified webhooks
  are normalized and returned (`persisted: false`) but not stored, and do not
  create cases in the dashboard.
- **No live connectors.** Auth0, PostHog, Zendesk and Stripe charge history are
  represented by the fixed records in the demo case files. Adyen and Braintree
  are not implemented.
- **Submission is simulated.** The "Submit to Stripe" / "Accept & refund"
  buttons only show a notice; no processor API is called.
- **The analyze route is unauthenticated** and only accepts demo case IDs. Add
  authentication and per-merchant scoping before it touches real data.
- **The live Gemini call has not been exercised in this repository** (no API
  key was available while building it). The request is checked against the real
  SDK talking to a local stand-in server, and the parsing, grounding and
  fallback paths are covered by tests, but the default model ID and Gemini's
  acceptance of the response schema are unverified: run it with a real key
  before relying on it.
- **Rule-based cover letters are templates** in German, Portuguese (Brazil),
  Japanese, French and English. They have not been reviewed by native
  speakers.
- KPIs (win rate, time to submit, recovered amount, dispute rate vs. the 0.9%
  threshold) are computed from demo history in `src/lib/demo/history.ts`.
- Network rule summaries in `src/lib/domain/reason-codes.ts` are paraphrases,
  not the network texts.
- Unknown case URLs render the not-found page but with HTTP 200, because Cache
  Components streams the page shell and `dynamicParams` is not available.
- shadcn/ui components in `src/components/ui` were written by hand following
  the shadcn source (the registry was not reachable from the build
  environment); they use the `radix-ui` package.

## Demo data

Six open disputes for a fictional SaaS merchant, Lumen Analytics, as of
28 Oct 2026. All people, banks and companies are fictional.

| Case | Network / code | Issuer language | Expected verdict |
| --- | --- | --- | --- |
| CG-1041 | Visa 10.4 | German | Contest — CE 3.0 eligible, MFA login from known device |
| CG-1042 | Visa 13.1 | Portuguese (BR) | Contest — heavy usage after purchase |
| CG-1043 | Mastercard 4837 | Japanese | Contest — passkey login on registered device |
| CG-1044 | Mastercard 4853 | French | **Accept** — refund asked 3 days after renewal, never answered |
| CG-1045 | Visa 10.4 | French | Contest, low confidence — CE 3.0 not met (one qualifying transaction) |
| CG-1046 | Mastercard 4853 | German | Contest — no cancellation, refund asked after the window; ticket contains a prompt-injection attempt |

## Layout

```
src/lib/domain/        Types and reason-code catalog
src/lib/ce3/           Visa CE 3.0 audit engine
src/lib/stripe/        Webhook signature verification + normalization
src/lib/analysis/      Signals, prompt, Gemini call, grounding, rule-based dossier, letters
src/lib/demo/          Demo case files, ToS, KPI history
src/app/api/           analyze + Stripe webhook route handlers
src/app/dashboard/     Queue + KPI page and case view
src/components/        Landing, dashboard and ui components
tests/                 CE 3.0, Stripe webhook, analysis and metrics tests
```
