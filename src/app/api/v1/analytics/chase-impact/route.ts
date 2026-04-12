import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, requireScope } from "@/lib/auth";
import { computeChaseImpact } from "@/lib/analytics";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/v1/analytics/chase-impact — Response rate after N chase reminders.
 *
 * Query params:
 *   ?since=... — ISO date, only include reminders created after this (optional)
 *
 * Requires scope: analytics:read (or wildcard)
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "analytics:read", "*");

    const { searchParams } = new URL(req.url);
    const sinceRaw = searchParams.get("since");
    const since = sinceRaw ? new Date(sinceRaw) : undefined;

    const data = await computeChaseImpact(ctx.orgId, { since });

    const response = NextResponse.json({ data });
    response.headers.set("Cache-Control", "private, max-age=60");
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
