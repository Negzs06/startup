import { analyzeDispute } from "@/lib/analyze";
import { getDispute } from "@/lib/disputes";

export async function POST(_request: Request, ctx: RouteContext<"/api/disputes/[id]/analyze">) {
  const { id } = await ctx.params;
  const dispute = getDispute(id);
  if (!dispute) {
    return Response.json({ error: "Dispute not found" }, { status: 404 });
  }
  return Response.json(await analyzeDispute(dispute));
}
