import { prisma } from "./db";
import { sendChaseNotification } from "./notifications";
import { logger } from "./logger";
import { CHASE_INTERVAL_HOURS, CHASE_MAX_SEND_COUNT } from "./constants";
import { WorkflowStep } from "@/types";

interface ChaseCycleResult {
  checked: number;
  sent: number;
  skipped: number;
  resolved: number;
  errors: number;
}

const BATCH_SIZE = 50;

/**
 * Run one pass of the chase engine. Processes reminders in parallel batches
 * of 50 for throughput at scale.
 */
export async function runChaseCycle(): Promise<ChaseCycleResult> {
  const now = new Date();
  const result: ChaseCycleResult = {
    checked: 0,
    sent: 0,
    skipped: 0,
    resolved: 0,
    errors: 0,
  };

  const dueReminders = await prisma.chaseReminder.findMany({
    where: {
      resolvedAt: null,
      nextDueAt: { lte: now },
    },
    include: {
      submission: {
        select: {
          id: true,
          orgId: true,
          status: true,
          currentStep: true,
          stuckSince: true,
          workflow: { select: { steps: true } },
        },
      },
    },
  });

  result.checked = dueReminders.length;
  logger.info({ count: dueReminders.length }, "Chase cycle started");

  // Process in parallel batches
  for (let i = 0; i < dueReminders.length; i += BATCH_SIZE) {
    const batch = dueReminders.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((reminder) => processReminder(reminder, now))
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        result[r.value]++;
      } else {
        result.errors++;
      }
    }
  }

  logger.info(result, "Chase cycle complete");
  return result;
}

async function processReminder(
  reminder: any,
  now: Date
): Promise<"sent" | "skipped" | "resolved"> {
  const submission = reminder.submission;

  // Stop chasing if the submission has moved on
  if (submission.status !== "pending" || submission.currentStep !== reminder.stepOrder) {
    await prisma.chaseReminder.update({
      where: { id: reminder.id },
      data: { resolvedAt: now },
    });
    return "resolved";
  }

  // Safety cap
  if (reminder.sendCount >= CHASE_MAX_SEND_COUNT) {
    await prisma.chaseReminder.update({
      where: { id: reminder.id },
      data: { resolvedAt: now },
    });
    return "resolved";
  }

  const steps = submission.workflow.steps as unknown as WorkflowStep[];
  const currentStepConfig = steps.find((s) => s.order === submission.currentStep);
  if (!currentStepConfig) {
    logger.warn({ submissionId: submission.id }, "Current step config missing, resolving reminder");
    await prisma.chaseReminder.update({
      where: { id: reminder.id },
      data: { resolvedAt: now },
    });
    return "resolved";
  }

  const { recipientCount } = await sendChaseNotification({
    orgId: submission.orgId,
    submissionId: submission.id,
    stepLabel: currentStepConfig.label,
    approverRole: currentStepConfig.approver_role,
    sendCount: reminder.sendCount,
    stuckSince: submission.stuckSince,
  });

  const nextDueAt = new Date(now.getTime() + CHASE_INTERVAL_HOURS * 60 * 60 * 1000);

  await prisma.chaseReminder.update({
    where: { id: reminder.id },
    data: {
      sendCount: { increment: 1 },
      lastSentAt: now,
      nextDueAt,
    },
  });

  return recipientCount > 0 ? "sent" : "skipped";
}
