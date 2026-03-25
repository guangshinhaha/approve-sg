import { NextResponse } from "next/server";

/**
 * GET /api/health — Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "approvesg",
    timestamp: new Date().toISOString(),
  });
}
