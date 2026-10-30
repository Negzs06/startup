# ChargeGuard AI

MVP of an autonomous chargeback-representment platform for SaaS and digital
commerce merchants. A dispute arrives, ChargeGuard audits the evidence, asks
Claude to build the dossier (timeline, contract clauses, cover letter in the
issuing bank's language) and files it through the processor.

Built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui and the
Anthropic SDK.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000 (landing) and /dashboard
npm test           # CE 3.0 engine + Stripe webhook tests
npm run typecheck
```

Without configuration the dashboard runs on demo data and a rule-based
dossier. Set these to go live:

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Enables the Claude analysis (`src/lib/analyze.ts`). |
| `CHARGEGUARD_MODEL` | Optional model override; defaults to `claude-opus-5-5`. |
| `STRIPE_WEBHOOK_SECRET` | Required by `POST /api/webhooks/stripe`; it returns 503 without it. |

## Layout

```
src/lib/ce3.ts             Visa Compelling Evidence 3.0 audit (deterministic)
src/lib/analyze.ts         Claude call with a zod-validated dossier schema
src/lib/fixtures.ts        Offline dossier builder (demo / fallback)
src/lib/stripe-webhook.ts  Signature verification + dispute normalization
src/lib/disputes.ts        Demo disputes and portfolio figures
src/app/api/disputes/[id]/analyze   POST: run the analysis for a dispute
src/app/api/webhooks/stripe         POST: charge.dispute.created receiver
src/components/dashboard/  Queue, case view, KPI row
src/components/landing/    Marketing page
```

## What is real and what is a stub

- **Real:** CE 3.0 audit, Stripe signature verification, the Claude request
  and its schema-validated response.
- **Stubs:** there is no database, so webhooks are verified and normalized but
  not stored; the Auth0, PostHog and Zendesk connectors are represented by
  the normalized records in `src/lib/disputes.ts`; "Submit" is simulated and
  never calls a processor's Dispute API. The Claude path has not been run
  against the live API in this repo; only the offline fallback is exercised.
- The CE 3.0 rules are a simplified reading (two undisputed prior
  transactions, 120-365 days old, sharing IP or device ID plus one more
  element). Verify them against the current Visa rules before filing real
  evidence.
- The analyze route is unauthenticated and only accepts the demo dispute IDs;
  add auth and per-merchant scoping before it serves real data.
