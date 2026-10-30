import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { DISPUTES, PORTFOLIO } from "@/lib/disputes";

export const metadata: Metadata = { title: "Disputes — ChargeGuard AI" };

export default function DashboardPage() {
  return (
    <>
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-primary" /> ChargeGuard AI
          </Link>
          <span className="text-sm text-muted-foreground">Lumen Analytics · demo data</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Disputes</h1>
        <DashboardClient disputes={DISPUTES} portfolio={PORTFOLIO} />
      </main>
    </>
  );
}
