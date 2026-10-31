import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

const NAV = [
  ["Problem", "#problem"],
  ["How it works", "#how-it-works"],
  ["Why Gemini", "#why-gemini"],
  ["Pricing", "#pricing"],
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV.map(([label, href]) => (
            <a key={href} href={href} className="transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <Button asChild size="sm">
          <Link href="/dashboard">Live demo</Link>
        </Button>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-muted-foreground sm:px-6 md:flex-row md:justify-between">
        <p>© 2026 ChargeGuard AI. Prototype — demo data only.</p>
        <p>Not affiliated with Visa, Mastercard, Stripe, Adyen or Braintree. Network rules are summarised, not quoted.</p>
      </div>
    </footer>
  );
}
