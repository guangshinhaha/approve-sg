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

/**
 * Run one pass of the chase engine. Intended to be invoked by a cron job
 * (Railway Cron service hits /api/internal/chase on a schedule).
 *
 * For every ChaseReminder that is active and due, we:
 *   - Load the submission + workflow + current step config
 *   - If the submission is no longer pending (or moved to a different step),
 *     resolve the reminder and skip.
 *   - If the reminder has hit CHASE_MAX_SEND_COUNT, resolve it and skip.
 *   - Otherwise, resolve the current step's approver_role to org member emails
 *     and send a chase email. Bump sendCount and nextDueAt.
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
        include: { workflow: true },
      },
    },
  });

  result.checked = dueReminders.length;
  logger.info({ count: dueReminders.length }, "Chase cycle started");

  for (const reminder of dueReminders) {
    try {
      const submission = reminder.submission;

      // Stop chasing if the submission has moved on.
      if (submission.status !== "pending" || submission.currentStep !== reminder.stepOrder) {
        await prisma.chaseReminder.update({
          where: { id: reminder.id },
          data: { resolvedAt: now },
        });
        result.resolved++;
        continue;
      }

      // Safety cap: stop chasing after CHASE_MAX_SEND_COUNT emails.
      if (reminder.sendCount >= CHASE_MAX_SEND_COUNT) {
        await prisma.chaseReminder.update({
          where: { id: reminder.id },
          data: { resolvedAt: now },
        });
        result.resolved++;
        continue;
      }

      const steps = submission.workflow.steps as unknown as WorkflowStep[];
      const currentStepConfig = steps.find((s) => s.order === submission.currentStep);
      if (!currentStepConfig) {
        logger.warn({ submissionId: submission.id }, "Current step config missing, resolving reminder");
        await prisma.chaseReminder.update({
          where: { id: reminder.id },
          data: { resolvedAt: now },
        });
        result.resolved++;
        continue;
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

      if (recipientCount > 0) {
        result.sent++;
      } else {
        result.skipped++;
      }
    } catch (err) {
      logger.error({ err, reminderId: reminder.id }, "Chase reminder failed");
      result.errors++;
    }
  }

  logger.info(result, "Chase cycle complete");
  return result;
}
