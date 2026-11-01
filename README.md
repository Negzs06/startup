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

## Landing page

The landing (`src/app/page.tsx`, `src/components/landing/`) is "the evidence room":
a light, physical page (paper, ink, a vermilion stamp colour) where a spilled case
file is gathered, audited, sealed and filed as you scroll. Concept, palette, type,
the 3D story and the scroll storyboard: `docs/landing-concept.md`. Screenshots:
`docs/landing-screenshots/`.

- **Stack:** the page is a statically prerendered Server Component; demo records for
  the 3D paper and the CE 3.0 explainer are sliced on the server (`data.ts`). Client
  islands: `scene-stage.tsx` (3D), `landing-motion.tsx` (scroll choreography),
  `ce3-explainer.tsx`, `stamp-link.tsx`. Added dependencies: `three` (no React
  wrapper), `gsap` (ScrollTrigger and SplitText; GSAP's "Standard 'no charge'"
  licence, see gsap.com/standard-license) and `lenis`. Type: Archivo (variable width)
  and Courier Prime via `next/font`. Landing styles are scoped to `.landing` and
  `html[data-landing]` in `landing.css`; the dashboard renders pixel-identical to
  before (light and dark, list and case view, also after client-side navigation).
- **3D** (`scene/evidence-scene.ts`, loaded by dynamic `import()` on idle): paper
  sheets, receipts and kraft tags whose text is drawn in code from demo case CG-1041
  (`scene/paper-textures.ts`), a glassine envelope, a manila folder with a hinged
  cover and a brass seal. MeshStandard/MeshPhysical materials on generated cotton and
  manila textures, a key and a rim light, three's bundled `RoomEnvironment`, shadows on
  a shadow-catcher plane, no bloom. A Catmull-Rom camera path runs through seven
  states (disputed, webhook, records, CE 3.0, dossier, verdict, filed) driven by
  scroll; the seal mark is an ink-bleed shader. Pointer tilt with spring inertia on
  fine pointers. DPR is capped at 1.5 (1.25 on the low tier); small, ≤4-core or ≤4 GB
  devices get smaller textures and shadow maps and no glass transmission; rolling
  90-frame windows lower quality once (DPR 1, no shadows) and then switch the scene
  off if it still runs under 30 fps; rendering stops while the tab is hidden or an
  opaque room covers the screen. Boot work yields between steps and shaders compile
  with `compileAsync`.
- **Scroll** (`landing-motion.tsx`, GSAP + ScrollTrigger + SplitText, Lenis wired to
  ScrollTrigger via `lenis.on("scroll", ScrollTrigger.update)` and the GSAP ticker):
  the hero word zooms into the stem of its "I" until it becomes the vermilion room;
  a sticky pipeline scrubs the camera through states 0→5 with a form rail, a flip
  counter and line-masked copy; the CE 3.0 room opens like a door and stays pinned
  while the verdict sheet slides over it; numerals count up; a reason-code marquee
  follows scroll velocity; the CTA stamps the button and wipes to /dashboard.
- **CE 3.0 explainer:** runs `auditCe3` from `src/lib/ce3/audit.ts` in the browser on
  demo cases CG-1041 (met) and CG-1045 (not met); tags are keyboard-focusable
  buttons and the result is announced politely.
- **Fallbacks:** nothing starts hidden in the server HTML. With reduced motion,
  neither GSAP, Lenis nor the scene loads and the page is a static composition
  built from the generated photographs (the CE 3.0 explainer still works). Without
  WebGL, with a software renderer (SwiftShader/llvmpipe; `?webgl=force` loads the
  scene anyway, `&scenedebug` exposes `window.__cgScene` for tests), or if the scene
  chunk fails, the same photographs stand in for the scene. In-page links keep native
  semantics under Lenis (hash updated, focus moved, pinned rooms measured from their
  pin-spacer); keyboard scrolling and find-in-page work.
- **Measured** (production build, local headless Chromium, 1440×900): JS transferred
  for `/` at load 151.5 KB (v1 146.5 KB, the original page 139.6 KB); after idle
  210 KB with GSAP, ScrollTrigger, SplitText and Lenis; 356 KB once the 3D chunk
  loads. With reduced motion 156 KB in total. CLS 0.004 (0 under reduced motion).
  Scrolling the whole page without the scene: 60 fps, no long tasks. Longest task at
  startup: 68 ms (reduced motion), 105 ms (no WebGL); where a WebGL context is
  created on the SwiftShader software renderer, that creation alone takes ~330 ms on
  the idle callback. The scene itself could only be run on SwiftShader (no GPU in the
  build environment), where it draws correctly but at 3–12 fps, which says nothing
  about real GPUs and is why software renderers get the photographs. Not measured:
  real-GPU frame rates, real devices, Safari, Firefox, a Lighthouse run.

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
- **The live Gemini call was run once, by hand, on 2026-10-31** against all six
  demo cases with a real key: the default model ID and the response schema were
  accepted, verdicts matched the table below (CG-1044 accepted, the planted
  prompt-injection text in CG-1046 flagged and ignored) and no grounding
  guardrail fired. That run is not part of the test suite and was not repeated
  with other keys, models or real merchant data; the model sometimes answers
  503 "high demand", which the client retries (3 attempts) before falling back
  to the rule-based dossier. Letter wording has not been reviewed by native
  speakers.
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

## Evaluating the model analysis

`npm test` never calls a model. To check that a model or prompt change did not
make the dossiers worse, run the live evaluation:

```bash
GEMINI_API_KEY=... npm run eval -- [--trials 2] [--concurrency 1] [--cases CG-1044,CG-1045] \
                                   [--model <id>] [--baseline evals/baseline.json] [--update-baseline]
```

It analyses each demo case `--trials` times and grades every result with
deterministic checks (no second model as judge), defined in `evals/graders.ts`:
verdict, confidence range, grounding notes, consistency with the computed CE 3.0
audit, cover-letter language, no internal evidence IDs or raw ISO timestamps in
the letters, the letters name the case, the letter agrees with the verdict, the
timeline cites the disputed charge, and the planted injection is flagged.
Expectations live in `evals/cases.ts` and are judgement calls, not model output.

- **Gates apply per case.** Each check has a minimum pass rate that every case
  must meet, so an average cannot hide a case that always fails. Exit code 1 on
  a failed gate, 2 on bad usage.
- **Fallbacks are not counted as model results.** A trial that fell back to the
  rule-based dossier (rate limit, 5xx, refusal) is reported separately, and a run
  with more than 25% of them, or one that stopped early, fails.
- **Baseline.** With `--baseline`, a drop of more than 10 points in any check
  versus the saved summary fails the run. `--update-baseline` writes
  `evals/baseline.json`, but only from a run with no failures. No baseline is
  committed yet (see below), and the baseline write path has not been exercised
  against the live API.
- **Cost.** It makes cases x trials requests (12 by default). The Gemini free
  tier allowed 20 requests per model per day on the key used while building
  this, and the quota is per model, so one default run fits once a day. The run
  stops early when the daily quota is gone.
- Full dossiers of each run go to `evals/results/` (git-ignored).
- The graders themselves are covered by offline tests (`tests/evals.test.ts`):
  they accept the rule-based reference dossiers and reject deliberately broken ones.

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
src/components/        Landing (rooms, 3D scene, scroll choreography, CE 3.0 explainer), dashboard and ui components
docs/                  Landing page concept and screenshots
tests/                 CE 3.0, Stripe webhook, analysis, Gemini client, grader and metrics tests
evals/                 Live evaluation: expectations, graders, report, runner
```
