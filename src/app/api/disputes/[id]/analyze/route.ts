import type { NextRequest } from "next/server";
import { analyzeCase } from "@/lib/analysis/analyze";
import { getDemoCase } from "@/lib/demo/cases";

// A Claude analysis with adaptive thinking can take a while.
export const maxDuration = 300;

// NOTE: unauthenticated and limited to the demo case files. Add auth and
// per-merchant scoping before this route ever serves real dispute data.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/disputes/[id]/analyze">) {
  const { id } = await ctx.params;
  const caseFile = getDemoCase(id);
  if (!caseFile) return Response.json({ error: `Unknown dispute ${id}` }, { status: 404 });

  const result = await analyzeCase(caseFile, {
    generatedAt: new Date().toISOString(),
    apiKey: process.env.ANTHROPIC_API_KEY,
    ruleBasedOnly: request.nextUrl.searchParams.get("mode") === "rule-based",
  });
  return Response.json(result);
}
