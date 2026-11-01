import type { Metadata } from "next";
import "@/components/landing/landing.css";
import { displayFont } from "@/components/landing/fonts";
import { LandingMotion } from "@/components/landing/landing-motion";
import { FinalCta, Pricing, Targets, WhyGemini } from "@/components/landing/sections";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { Stage } from "@/components/landing/stage";
import { Filing, Hero, HowItWorks, Problem, Verdict } from "@/components/landing/story";

const description =
  "ChargeGuard AI turns a dispute webhook into a bank-grade evidence dossier: audited against Visa Compelling Evidence 3.0, argued by Gemini, written in the issuing bank's language.";

// Absolute URLs for the Open Graph image. Set SITE_URL in production; Vercel's own URL is used when present.
const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  description,
  openGraph: {
    title: "ChargeGuard AI: autonomous chargeback representment",
    description,
    type: "website",
    images: [
      {
        url: "/images/landing/og.jpg",
        width: 1200,
        height: 630,
        alt: "Luminous fragments converging into a circular seal on a dark navy background",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/images/landing/og.jpg"] },
};

export default function Home() {
  return (
    <div className={`landing ${displayFont.variable}`}>
      <Stage />
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Problem />
        <HowItWorks />
        <Verdict />
        <Filing />
        <WhyGemini />
        <Targets />
        <Pricing />
        <FinalCta />
      </main>
      <SiteFooter />
      <LandingMotion />
    </div>
  );
}
