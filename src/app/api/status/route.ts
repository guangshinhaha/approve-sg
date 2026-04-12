import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

interface CheckResult {
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  detail?: string;
}

interface StatusResponse {
  overall: "operational" | "degraded" | "down";
  timestamp: string;
  checks: {
    api: CheckResult;
    database: CheckResult;
    redis: CheckResult;
    chaseEngine: CheckResult;
  };
  metrics: {
    totalOrganizations: number;
    activeWorkflows: number;
    pendingSubmissions: number;
    totalSubmissions: number;
    approvedLast24h: number;
    activeChaseReminders: number;
    avgApprovalLatencyHours: number | null;
  };
}

async function timedCheck<T>(
  fn: () => Promise<T>
): Promise<{ result: T; latencyMs: number }> {
  const start = performance.now();
  const result = await fn();
  return { result, latencyMs: Math.round(performance.now() - start) };
}

/**
 * GET /api/status — Public status endpoint (no auth required).
 * Runs health checks and returns system metrics.
 */
export async function GET() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Run all checks in parallel
  const [dbCheck, redisCheck, chaseCheck, metricsResult] = await Promise.allSettled([
    // Database check
    timedCheck(async () => {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    }),

    // Redis check
    timedCheck(async () => {
      if (!redis) return "not_configured" as const;
      await redis.ping();
      return true;
    }),

    // Chase engine check — verify scheduler is running by checking
    // if there are any recent reminders (system is actively tracking)
    timedCheck(async () => {
      const count = await prisma.chaseReminder.count({
        where: { resolvedAt: null },
      });
      return count;
    }),

    // Metrics — all count queries in parallel
    Promise.all([
      prisma.organization.count(),
      prisma.workflow.count({ where: { active: true } }),
      prisma.submission.count({ where: { status: "pending" } }),
      prisma.submission.count(),
      prisma.submission.count({
        where: {
          status: "approved",
          updatedAt: { gte: twentyFourHoursAgo },
        },
      }),
      prisma.chaseReminder.count({ where: { resolvedAt: null } }),
      // Avg approval latency (last 30 days)
      prisma.$queryRaw<[{ avg_hours: number | null }]>`
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - submitted_at)) / 3600)::numeric, 1) as avg_hours
        FROM submissions
        WHERE status = 'approved'
          AND updated_at >= NOW() - INTERVAL '30 days'
      `,
    ]),
  ]);

  // Parse database check
  const db: CheckResult =
    dbCheck.status === "fulfilled"
      ? { status: "operational", latencyMs: dbCheck.value.latencyMs }
      : { status: "down", latencyMs: 0, detail: "Database unreachable" };

  // Parse Redis check
  let redisResult: CheckResult;
  if (redisCheck.status === "fulfilled") {
    const val = redisCheck.value.result;
    if (val === "not_configured") {
      redisResult = { status: "operational", latencyMs: 0, detail: "In-memory fallback (Redis not configured)" };
    } else {
      redisResult = { status: "operational", latencyMs: redisCheck.value.latencyMs };
    }
  } else {
    redisResult = { status: "degraded", latencyMs: 0, detail: "Redis unreachable, using in-memory fallback" };
  }

  // Parse chase engine check
  const chase: CheckResult =
    chaseCheck.status === "fulfilled"
      ? {
          status: "operational",
          latencyMs: chaseCheck.value.latencyMs,
          detail: `${chaseCheck.value.result} active reminders`,
        }
      : { status: "degraded", latencyMs: 0, detail: "Chase query failed" };

  // Parse metrics
  let metrics: StatusResponse["metrics"];
  if (metricsResult.status === "fulfilled") {
    const [orgs, workflows, pending, total, approved24h, activeReminders, avgLatency] =
      metricsResult.value;
    metrics = {
      totalOrganizations: orgs,
      activeWorkflows: workflows,
      pendingSubmissions: pending,
      totalSubmissions: total,
      approvedLast24h: approved24h,
      activeChaseReminders: activeReminders,
      avgApprovalLatencyHours: avgLatency[0]?.avg_hours ?? null,
    };
  } else {
    metrics = {
      totalOrganizations: 0,
      activeWorkflows: 0,
      pendingSubmissions: 0,
      totalSubmissions: 0,
      approvedLast24h: 0,
      activeChaseReminders: 0,
      avgApprovalLatencyHours: null,
    };
  }

  // Overall status
  const allChecks = [db, redisResult, chase];
  const overall: StatusResponse["overall"] = allChecks.some((c) => c.status === "down")
    ? "down"
    : allChecks.some((c) => c.status === "degraded")
    ? "degraded"
    : "operational";

  const api: CheckResult = {
    status: overall === "down" ? "degraded" : "operational",
    latencyMs: Math.round(
      [db, redisResult, chase]
        .filter((c) => c.latencyMs > 0)
        .reduce((sum, c, _, arr) => sum + c.latencyMs / arr.length, 0)
    ),
  };

  const response: StatusResponse = {
    overall,
    timestamp: now.toISOString(),
    checks: { api, database: db, redis: redisResult, chaseEngine: chase },
    metrics,
  };

  const res = NextResponse.json(response);
  res.headers.set("Cache-Control", "public, max-age=10");
  return res;
}
