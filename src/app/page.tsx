import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { HeroSection } from "@/components/landing/hero-section";
import {
  CtaSection,
  FlowSection,
  MetricsSection,
  PricingSection,
  ProblemSection,
} from "@/components/landing/sections";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <FlowSection />
        <PricingSection />
        <MetricsSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
