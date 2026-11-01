# Landing page concept — "Chain of Custody"

## The idea in one line

A chargeback scatters the truth across four systems; ChargeGuard gathers every
fragment back into one sealed, verifiable record. The page *is* that act of
gathering: the visitor scrolls a cloud of loose evidence into a seal.

## Visual metaphor

- **Fragments** — a field of luminous particles. At rest they drift, unordered,
  a few of them warm amber: the dispute, the threat, the missing context.
- **Strands** — as the visitor scrolls, particles organise into curved strands
  (one per evidence source: logins, product usage, support tickets, contract).
- **Seal** — the strands close into a precise seal of concentric rings and
  radial hairlines: the verified verdict.
- **Filing** — the seal compresses and leaves along a single line: the dossier
  is filed (in this MVP, filing is simulated, and the copy says so).

The fractured glass card (a generated still) stands for the chargeback itself:
a payment that was fine until it cracked.

## Palette (scoped to `.landing`, the dashboard keeps its own tokens)

| Token | Role | Value |
| --- | --- | --- |
| `--lp-ink` | Page ground, deep ink navy | `oklch(0.14 0.03 262)` |
| `--lp-ink-2` | Raised surfaces | `oklch(0.19 0.035 262)` |
| `--lp-paper` | Primary text, "bone" paper | `oklch(0.95 0.012 85)` |
| `--lp-muted` | Secondary text | `oklch(0.76 0.02 255)` |
| `--lp-seal` | Verified / evidence, the brand teal brightened for dark ground | `oklch(0.82 0.1 180)` |
| `--lp-ember` | Threat / dispute, used sparingly | `oklch(0.78 0.15 60)` |
| `--lp-rule` | Hairlines | `oklch(1 0 0 / 12%)` |

Two signal colours only: amber means *at risk*, teal means *verified*. Nothing
else is coloured. No gradients beyond light falloff.

## Type system

- **Display:** Instrument Serif (regular + italic) — an editorial, legal-brief
  voice for headlines; italics carry the emotional word in each headline.
- **Text:** Geist (already in the app).
- **Evidence:** Geist Mono for record IDs, timestamps, reason codes and step
  numbers — the "forensic" layer, always small, tracked, uppercase.
- Fluid scale with `clamp()`; display sizes up to ~9rem on wide screens.

## Motion language

- **Precise, not bouncy.** One custom ease (`expo.out`-like) for reveals,
  linear scrub for scroll-linked state.
- **Lines draw, text rises from a mask, numbers are set like type.** No
  spinning, no bouncing, no glow pulses.
- **Scroll drives the 3D state**, never the reverse: the scene interpolates
  between four shapes (fragments → strands → seal → filed) from the scroll
  position of the narrative sections.
- **Cursor:** the particle field leans gently away from the pointer (pointer
  devices only). Primary buttons are magnetic by a few pixels. No custom cursor
  replacing the system one: it hurts usability more than it adds.
- **Page load:** the headline lines rise in sequence over ~1s (pure CSS, so it
  runs before any JS and is skipped under reduced motion).

## Scroll narrative

1. **Hero — the threat (unease).** Loose fragments drift; a few glow amber.
   "Every chargeback is a *case*. Most merchants lose it by default."
2. **The problem — the crack.** The fractured glass card. The four facts
   (70%+ friendly fraud, ~$48B, 0.9% threshold, CE 3.0's 120-day history), set
   large, labelled as industry estimates.
3. **How it works — evidence assembling (focus).** A pinned sequence on wide
   screens: webhook → records gathered → CE 3.0 audit → dossier. Particles
   form strands. On small screens and under reduced motion it is a plain
   ordered list.
4. **The verdict — relief, and restraint.** The strands close into the seal.
   Contest *or accept*: ChargeGuard recommends accepting when the merchant
   missed a refund inside its own window.
5. **Filing.** The seal leaves along a line: "Filed through the processor's
   Dispute API — simulated in this prototype."
6. **Why Gemini, targets, pricing, CTA — calm.** The scene settles; the page
   becomes a quiet editorial document. Targets are labelled as targets.

## Honesty rules applied

No logos, testimonials, "trusted by", awards or live metrics. Targets (>70%
win rate, <60 min) are always labelled as targets. The demo link is described
as demo data. Industry figures are labelled as estimates.

## Fallbacks

- **No WebGL / canvas fails / slow device:** the generated poster image of the
  converged seal sits under the canvas and is what you see; the canvas fades
  in only after its first frame.
- **Reduced motion:** no smooth scroll, no pinning, no scrubbed scene — the
  canvas is not loaded at all; the poster is shown; reveals are disabled.
- **JS animation libraries fail:** all content is in the server HTML and
  visible by default; animations only ever add motion to visible content.
