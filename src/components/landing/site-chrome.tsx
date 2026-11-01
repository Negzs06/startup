import Link from "next/link";
import { SealMark } from "./seal-mark";

const NAV = [
  ["Problem", "#problem"],
  ["How it works", "#how-it-works"],
  ["Verdict", "#verdict"],
  ["Why Gemini", "#why-gemini"],
  ["Pricing", "#pricing"],
] as const;

export function SiteHeader() {
  return (
    <>
      <a href="#main" className="lp-skip">
        Skip to content
      </a>
      <header className="lp-header">
        <div className="lp-wrap lp-header-inner">
          <Link href="/" className="lp-brand" aria-label="ChargeGuard AI, home">
            <SealMark />
            <span>
              ChargeGuard <span className="text-(--lp-seal)">AI</span>
            </span>
          </Link>
          <nav aria-label="Sections" className="lp-nav">
            {NAV.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <Link href="/dashboard" className="lp-btn lp-btn-ghost lp-btn-sm">
            Demo dashboard
          </Link>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap grid gap-8 py-12 md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-3">
          <Link href="/" className="lp-brand" aria-label="ChargeGuard AI, home">
            <SealMark size={24} />
            <span>ChargeGuard AI</span>
          </Link>
          <p className="lp-note max-w-xl">
            © 2026 ChargeGuard AI. Prototype running on fictional demo data. Not affiliated with Visa, Mastercard,
            Stripe, Adyen or Braintree; network rules are summarised, not quoted. Imagery on this page is AI-generated.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-(--lp-muted)">
          {NAV.map(([label, href]) => (
            <a key={href} href={href} className="hover:text-(--lp-paper)">
              {label}
            </a>
          ))}
          <Link href="/dashboard" className="hover:text-(--lp-paper)">
            Dashboard
          </Link>
        </nav>
      </div>
    </footer>
  );
}
