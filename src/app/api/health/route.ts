import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/health — Health check with DB connectivity verification
 */
export async function GET() {
  const checks: Record<string, string> = {};

  // Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const allHealthy = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: allHealthy ? "ok" : "degraded",
      service: "approvesg",
      version: process.env.npm_package_version || "0.1.0",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
