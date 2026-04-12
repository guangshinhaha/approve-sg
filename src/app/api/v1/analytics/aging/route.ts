import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, requireScope } from "@/lib/auth";
import { computeAging } from "@/lib/analytics";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/v1/analytics/aging — Avg / p50 / p95 time-to-approve per workflow.
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

    const data = await computeAging(ctx.orgId, { workflowId, since });

    const response = NextResponse.json({ data });
    response.headers.set("Cache-Control", "private, max-age=60");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
