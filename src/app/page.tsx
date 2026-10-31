import { Hero } from "@/components/landing/hero";
import { FinalCta, HowItWorks, Pricing, Problem, StatsBand, Targets, WhyGemini } from "@/components/landing/sections";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <StatsBand />
        <Problem />
        <HowItWorks />
        <WhyGemini />
        <Targets />
        <Pricing />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
