import type { Metadata } from "next";
import "@/components/landing/landing.css";
import { getCe3Cases, getSceneRecords } from "@/components/landing/data";
import { monoFont, sansFont } from "@/components/landing/fonts";
import { LandingMotion } from "@/components/landing/landing-motion";
import { Ce3Room, Filed, FinalCta, Hero, Pipeline, Pricing, Problem, Targets, Verdict, WhyGemini } from "@/components/landing/rooms";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";

const description =
  "ChargeGuard AI answers chargebacks with evidence: a dispute webhook opens the case, the records are audited against Visa Compelling Evidence 3.0, Gemini writes the dossier in the issuing bank's language, and it is filed.";

// Absolute URLs for the Open Graph image. Set SITE_URL in production; Vercel's own URL is used when present.
const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  description,
  openGraph: {
    title: "ChargeGuard AI: chargebacks, answered with evidence",
    description,
    type: "website",
    images: [
      {
        url: "/images/landing/og.jpg",
        width: 1200,
        height: 630,
        alt: "A spilled case file on a paper table: forms, receipts, a glassine envelope, a kraft tag and a rubber stamp",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/images/landing/og.jpg"] },
};

export default function Home() {
  const records = getSceneRecords();
  const ce3Cases = getCe3Cases();
  return (
    <div className={`landing ${sansFont.variable} ${monoFont.variable}`}>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <Hero records={records} />
        <Problem />
        <Pipeline />
        <Ce3Room cases={ce3Cases} />
        <Verdict />
        <Filed />
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
