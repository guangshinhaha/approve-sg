import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, requireScope } from "@/lib/auth";
import { computeBottlenecks } from "@/lib/analytics";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/v1/analytics/bottlenecks — Step-level time-in-state, ranked by slowest.
 *
 * Query params:
 *   ?workflowId=... — filter to a single workflow (optional)
 *   ?since=...      — ISO date, only include submissions completed after this (optional)
 *
 * Requires scope: analytics:read (or wildcard)
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "analytics:read", "*");

    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get("workflowId") || undefined;
    const sinceRaw = searchParams.get("since");
    const since = sinceRaw ? new Date(sinceRaw) : undefined;

    const data = await computeBottlenecks(ctx.orgId, { workflowId, since });

    const response = NextResponse.json({ data });
    response.headers.set("Cache-Control", "private, max-age=60");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
