import Link from "next/link";

const NAV = [
  ["Problem", "#problem"],
  ["How a case is built", "#how-it-works"],
  ["CE 3.0", "#ce3"],
  ["Verdict", "#verdict"],
  ["Pricing", "#pricing"],
] as const;

export function SiteHeader() {
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="masthead">
        <div className="wrap masthead-row">
          <Link href="/" className="wordmark" aria-label="ChargeGuard AI, home">
            ChargeGuard<span className="rec">AI</span>
          </Link>
          <nav aria-label="Sections" className="masthead-nav">
            {NAV.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <Link href="/dashboard" className="btn btn-ink btn-sm">
            Demo dashboard
          </Link>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer room-ink">
      <div className="wrap footer-grid">
        <p className="footer-mark" aria-hidden="true">
          ChargeGuard
        </p>
        <div className="footer-meta">
          <p className="rec">© 2026 ChargeGuard AI · Prototype on fictional demo data</p>
          <p>
            Not affiliated with Visa, Mastercard, Stripe, Adyen or Braintree. Network rules are summarised, not quoted.
            Photographs and textures on this page are AI-generated; every word on them is drawn in code.
          </p>
          <nav aria-label="Footer" className="footer-nav">
            {NAV.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
            <Link href="/dashboard">Dashboard</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
