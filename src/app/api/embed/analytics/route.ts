import { NextRequest, NextResponse } from "next/server";
import { verifyEmbedAuth } from "@/lib/embed-api-auth";
import { computeAging, computeBottlenecks, computeChaseImpact } from "@/lib/analytics";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/embed/analytics — Combined analytics payload for the embed dashboard.
 *
 * Returns aging, bottlenecks, and chase-impact data in a single response
 * so the dashboard can render without multiple round-trips.
 *
 * Query params:
 *   ?workflowId=... — filter to a single workflow (optional)
 *   ?since=...      — ISO date (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyEmbedAuth(req);

    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get("workflowId") || undefined;
    const sinceRaw = searchParams.get("since");
    const since = sinceRaw ? new Date(sinceRaw) : undefined;

    const [aging, bottlenecks, chaseImpact] = await Promise.all([
      computeAging(user.orgId, { workflowId, since }),
      computeBottlenecks(user.orgId, { workflowId, since }),
      computeChaseImpact(user.orgId, { since }),
    ]);

    return NextResponse.json({ aging, bottlenecks, chaseImpact });
  } catch (error) {
    return handleApiError(error);
  }
}
