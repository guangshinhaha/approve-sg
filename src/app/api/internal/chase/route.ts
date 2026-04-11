import { NextRequest, NextResponse } from "next/server";
import { runChaseCycle } from "@/lib/chase";
import { handleApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * POST /api/internal/chase — Run one chase cycle. Invoked by a Railway Cron
 * service on a schedule. Auth via the X-Cron-Secret header matching the
 * CRON_SECRET env var so this endpoint can't be called externally.
 */
export async function POST(req: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      logger.error("CRON_SECRET env var not set; chase endpoint is disabled");
      return NextResponse.json(
        { error: "Chase endpoint not configured" },
        { status: 503 }
      );
    }

    const provided = req.headers.get("x-cron-secret");
    if (provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runChaseCycle();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
