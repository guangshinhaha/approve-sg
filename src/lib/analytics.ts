import { prisma } from "./db";

interface WorkflowStep {
  order: number;
  label: string;
  approver_role: string;
  required: boolean;
}

// ── Percentile helper ──────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

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
 * Compute avg / p50 / p95 time-to-approve per workflow.
 * Only considers submissions that reached a terminal state (approved/rejected).
 */
export async function computeAging(
  orgId: string,
  opts?: { workflowId?: string; since?: Date }
): Promise<AgingResult[]> {
  const where: Record<string, unknown> = {
    orgId,
    status: { in: ["approved", "rejected"] },
  };
  if (opts?.workflowId) where.workflowId = opts.workflowId;
  if (opts?.since) where.updatedAt = { gte: opts.since };

  const submissions = await prisma.submission.findMany({
    where,
    include: { workflow: true },
    orderBy: { updatedAt: "desc" },
  });

  // Group by workflow
  const byWorkflow = new Map<
    string,
    { workflow: (typeof submissions)[0]["workflow"]; durations: number[] }
  >();

  for (const sub of submissions) {
    const durationMs =
      new Date(sub.updatedAt).getTime() -
      new Date(sub.submittedAt).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    const existing = byWorkflow.get(sub.workflowId);
    if (existing) {
      existing.durations.push(durationHours);
    } else {
      byWorkflow.set(sub.workflowId, {
        workflow: sub.workflow,
        durations: [durationHours],
      });
    }
  }

  const results: AgingResult[] = [];
  for (const [workflowId, { workflow, durations }] of byWorkflow) {
    const sorted = [...durations].sort((a, b) => a - b);
    results.push({
      workflowId,
      workflowName: workflow.name,
      workflowType: workflow.workflowType,
      sampleSize: sorted.length,
      avgHours: Math.round(mean(sorted) * 100) / 100,
      p50Hours: Math.round(percentile(sorted, 50) * 100) / 100,
      p95Hours: Math.round(percentile(sorted, 95) * 100) / 100,
      minHours: Math.round(sorted[0] * 100) / 100,
      maxHours: Math.round(sorted[sorted.length - 1] * 100) / 100,
    });
  }

  return results.sort((a, b) => b.avgHours - a.avgHours);
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
 * Compute step-level time-in-state, ranked by slowest.
 *
 * For each step, we measure the time between when the step became active
 * (the previous step's approval, or submittedAt for step 1) and when
 * the step was acted upon (its own action timestamp).
 */
export async function computeBottlenecks(
  orgId: string,
  opts?: { workflowId?: string; since?: Date }
): Promise<BottleneckStep[]> {
  const where: Record<string, unknown> = {
    orgId,
    status: { in: ["approved", "rejected"] },
  };
  if (opts?.workflowId) where.workflowId = opts.workflowId;
  if (opts?.since) where.updatedAt = { gte: opts.since };

  const submissions = await prisma.submission.findMany({
    where,
    include: {
      workflow: true,
      actions: { orderBy: { actedAt: "asc" } },
    },
  });

  // Accumulate durations per (workflowId, stepOrder)
  const stepDurations = new Map<
    string,
    {
      workflowId: string;
      workflowName: string;
      stepOrder: number;
      stepLabel: string;
      approverRole: string;
      durations: number[];
    }
  >();

  for (const sub of submissions) {
    const steps = sub.workflow.steps as unknown as WorkflowStep[];
    const actions = sub.actions;

    for (const action of actions) {
      const stepDef = steps.find((s) => s.order === action.stepOrder);
      if (!stepDef) continue;

      // Step became active either at submission time (step 1) or when
      // the previous step was approved.
      let stepStartTime: Date;
      if (action.stepOrder === 1) {
        stepStartTime = sub.submittedAt;
      } else {
        const prevAction = actions.find(
          (a) => a.stepOrder === action.stepOrder - 1 && a.action === "approved"
        );
        if (!prevAction) continue; // skip if we can't determine start time
        stepStartTime = prevAction.actedAt;
      }

      const durationMs =
        new Date(action.actedAt).getTime() - stepStartTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      if (durationHours < 0) continue; // data integrity guard

      const key = `${sub.workflowId}:${action.stepOrder}`;
      const existing = stepDurations.get(key);
      if (existing) {
        existing.durations.push(durationHours);
      } else {
        stepDurations.set(key, {
          workflowId: sub.workflowId,
          workflowName: sub.workflow.name,
          stepOrder: action.stepOrder,
          stepLabel: stepDef.label,
          approverRole: stepDef.approver_role,
          durations: [durationHours],
        });
      }
    }
  }

  const results: BottleneckStep[] = [];
  for (const entry of stepDurations.values()) {
    const sorted = [...entry.durations].sort((a, b) => a - b);
    results.push({
      workflowId: entry.workflowId,
      workflowName: entry.workflowName,
      stepOrder: entry.stepOrder,
      stepLabel: entry.stepLabel,
      approverRole: entry.approverRole,
      sampleSize: sorted.length,
      avgHours: Math.round(mean(sorted) * 100) / 100,
      p50Hours: Math.round(percentile(sorted, 50) * 100) / 100,
      p95Hours: Math.round(percentile(sorted, 95) * 100) / 100,
    });
  }

  // Rank by slowest average
  return results.sort((a, b) => b.avgHours - a.avgHours);
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
 * Measure how effective chase reminders are at driving action.
 *
 * Groups resolved reminders by sendCount and computes:
 * - How many steps received N chases
 * - What % of those steps eventually got resolved
 * - Average time from first chase to resolution
 */
export async function computeChaseImpact(
  orgId: string,
  opts?: { since?: Date }
): Promise<ChaseImpactBucket[]> {
  const reminders = await prisma.chaseReminder.findMany({
    where: {
      submission: { orgId },
      ...(opts?.since ? { createdAt: { gte: opts.since } } : {}),
    },
    include: {
      submission: { select: { orgId: true } },
    },
  });

  // Filter to this org's reminders (belt-and-suspenders with the where clause)
  const orgReminders = reminders.filter((r) => r.submission.orgId === orgId);

  // Group by sendCount
  const buckets = new Map<
    number,
    { total: number; resolved: number; resolveTimes: number[] }
  >();

  for (const r of orgReminders) {
    if (r.sendCount === 0) continue; // never actually chased

    const bucket = buckets.get(r.sendCount) || {
      total: 0,
      resolved: 0,
      resolveTimes: [],
    };
    bucket.total++;

    if (r.resolvedAt) {
      bucket.resolved++;
      if (r.lastSentAt) {
        const resolveTimeHours =
          (new Date(r.resolvedAt).getTime() -
            new Date(r.lastSentAt).getTime()) /
          (1000 * 60 * 60);
        if (resolveTimeHours >= 0) {
          bucket.resolveTimes.push(resolveTimeHours);
        }
      }
    }

    buckets.set(r.sendCount, bucket);
  }

  const results: ChaseImpactBucket[] = [];
  for (const [count, bucket] of buckets) {
    results.push({
      chasesReceived: count,
      totalSteps: bucket.total,
      resolvedSteps: bucket.resolved,
      resolutionRate:
        bucket.total > 0
          ? Math.round((bucket.resolved / bucket.total) * 10000) / 100
          : 0,
      avgHoursToResolve:
        Math.round(mean(bucket.resolveTimes) * 100) / 100,
    });
  }

  return results.sort((a, b) => a.chasesReceived - b.chasesReceived);
}
