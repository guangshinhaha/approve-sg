import { Prisma } from "@prisma/client";
import { prisma } from "./db";

// ── Aging analytics ────────────────────────────────────────────────

export interface AgingResult {
  workflowId: string;
  workflowName: string;
  workflowType: string;
  sampleSize: number;
  avgHours: number;
  p50Hours: number;
  p95Hours: number;
  minHours: number;
  maxHours: number;
}

/**
 * Compute avg / p50 / p95 time-to-approve per workflow using PostgreSQL
 * aggregate functions. No data loaded into JS memory.
 */
export async function computeAging(
  orgId: string,
  opts?: { workflowId?: string; since?: Date }
): Promise<AgingResult[]> {
  const workflowFilter = opts?.workflowId
    ? Prisma.sql`AND s.workflow_id = ${opts.workflowId}::uuid`
    : Prisma.empty;
  const sinceFilter = opts?.since
    ? Prisma.sql`AND s.updated_at >= ${opts.since}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<AgingResult[]>`
    SELECT
      w.id AS "workflowId",
      w.name AS "workflowName",
      w.workflow_type AS "workflowType",
      COUNT(*)::int AS "sampleSize",
      ROUND(AVG(EXTRACT(EPOCH FROM (s.updated_at - s.submitted_at)) / 3600)::numeric, 2)::float AS "avgHours",
      ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (s.updated_at - s.submitted_at)) / 3600))::numeric, 2)::float AS "p50Hours",
      ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (s.updated_at - s.submitted_at)) / 3600))::numeric, 2)::float AS "p95Hours",
      ROUND(MIN(EXTRACT(EPOCH FROM (s.updated_at - s.submitted_at)) / 3600)::numeric, 2)::float AS "minHours",
      ROUND(MAX(EXTRACT(EPOCH FROM (s.updated_at - s.submitted_at)) / 3600)::numeric, 2)::float AS "maxHours"
    FROM submissions s
    JOIN workflows w ON s.workflow_id = w.id
    WHERE s.org_id = ${orgId}::uuid
      AND s.status IN ('approved', 'rejected')
      ${workflowFilter}
      ${sinceFilter}
    GROUP BY w.id, w.name, w.workflow_type
    ORDER BY "avgHours" DESC
  `;

  return rows;
}

// ── Bottleneck analytics ───────────────────────────────────────────

export interface BottleneckStep {
  workflowId: string;
  workflowName: string;
  stepOrder: number;
  stepLabel: string;
  approverRole: string;
  sampleSize: number;
  avgHours: number;
  p50Hours: number;
  p95Hours: number;
}

/**
 * Compute step-level time-in-state using PostgreSQL CTEs.
 * Derives step start from previous step's approval (or submittedAt for step 1).
 */
export async function computeBottlenecks(
  orgId: string,
  opts?: { workflowId?: string; since?: Date }
): Promise<BottleneckStep[]> {
  const workflowFilter = opts?.workflowId
    ? Prisma.sql`AND s.workflow_id = ${opts.workflowId}::uuid`
    : Prisma.empty;
  const sinceFilter = opts?.since
    ? Prisma.sql`AND s.updated_at >= ${opts.since}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<BottleneckStep[]>`
    WITH step_durations AS (
      SELECT
        s.workflow_id,
        w.name AS workflow_name,
        aa.step_order,
        w.steps -> (aa.step_order - 1) ->> 'label' AS step_label,
        w.steps -> (aa.step_order - 1) ->> 'approver_role' AS approver_role,
        EXTRACT(EPOCH FROM (
          aa.acted_at - COALESCE(
            (SELECT prev.acted_at
             FROM approval_actions prev
             WHERE prev.submission_id = s.id
               AND prev.step_order = aa.step_order - 1
               AND prev.action = 'approved'
             ORDER BY prev.acted_at DESC
             LIMIT 1),
            s.submitted_at
          )
        )) / 3600 AS duration_hours
      FROM submissions s
      JOIN workflows w ON s.workflow_id = w.id
      JOIN approval_actions aa ON s.id = aa.submission_id
      WHERE s.org_id = ${orgId}::uuid
        AND s.status IN ('approved', 'rejected')
        ${workflowFilter}
        ${sinceFilter}
    )
    SELECT
      workflow_id AS "workflowId",
      workflow_name AS "workflowName",
      step_order::int AS "stepOrder",
      step_label AS "stepLabel",
      approver_role AS "approverRole",
      COUNT(*)::int AS "sampleSize",
      ROUND(AVG(duration_hours)::numeric, 2)::float AS "avgHours",
      ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_hours))::numeric, 2)::float AS "p50Hours",
      ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_hours))::numeric, 2)::float AS "p95Hours"
    FROM step_durations
    WHERE duration_hours >= 0
    GROUP BY workflow_id, workflow_name, step_order, step_label, approver_role
    ORDER BY "avgHours" DESC
  `;

  return rows;
}

// ── Chase impact analytics ─────────────────────────────────────────

export interface ChaseImpactBucket {
  chasesReceived: number;
  totalSteps: number;
  resolvedSteps: number;
  resolutionRate: number;
  avgHoursToResolve: number;
}

/**
 * Measure chase reminder effectiveness using PostgreSQL aggregation.
 */
export async function computeChaseImpact(
  orgId: string,
  opts?: { since?: Date }
): Promise<ChaseImpactBucket[]> {
  const sinceFilter = opts?.since
    ? Prisma.sql`AND cr.created_at >= ${opts.since}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<ChaseImpactBucket[]>`
    SELECT
      cr.send_count::int AS "chasesReceived",
      COUNT(*)::int AS "totalSteps",
      COUNT(cr.resolved_at)::int AS "resolvedSteps",
      ROUND((COUNT(cr.resolved_at)::numeric / NULLIF(COUNT(*), 0) * 100), 2)::float AS "resolutionRate",
      ROUND(COALESCE(AVG(
        CASE WHEN cr.resolved_at IS NOT NULL AND cr.last_sent_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (cr.resolved_at - cr.last_sent_at)) / 3600
        END
      ), 0)::numeric, 2)::float AS "avgHoursToResolve"
    FROM chase_reminders cr
    JOIN submissions s ON cr.submission_id = s.id
    WHERE s.org_id = ${orgId}::uuid
      AND cr.send_count > 0
      ${sinceFilter}
    GROUP BY cr.send_count
    ORDER BY "chasesReceived" ASC
  `;

  return rows;
}
