import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { AppError, NotFoundError } from "./errors";
import { dispatchWebhookEvent } from "./webhooks";
import { sendApprovalNotification, sendStatusNotification } from "./notifications";
import { CHASE_INTERVAL_HOURS } from "./constants";
import { logger } from "./logger";

function nextChaseDueAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + CHASE_INTERVAL_HOURS * 60 * 60 * 1000);
}

type TxClient = Prisma.TransactionClient;

async function createOrReplaceReminder(tx: TxClient, submissionId: string, stepOrder: number) {
  await tx.chaseReminder.upsert({
    where: { submissionId_stepOrder: { submissionId, stepOrder } },
    update: {
      nextDueAt: nextChaseDueAt(),
      resolvedAt: null,
      sendCount: 0,
      lastSentAt: null,
    },
    create: {
      submissionId,
      stepOrder,
      nextDueAt: nextChaseDueAt(),
    },
  });
}

async function resolveActiveReminders(tx: TxClient, submissionId: string) {
  await tx.chaseReminder.updateMany({
    where: { submissionId, resolvedAt: null },
    data: { resolvedAt: new Date() },
  });
}

interface WorkflowStep {
  order: number;
  label: string;
  approver_role: string;
  required: boolean;
}

/**
 * The minimal identity needed to record an approval action. For session-based
 * auth, callers pass the logged-in user's id and role. For API-key auth,
 * callers pass the actor identity supplied in the request body by the host
 * product.
 */
export interface ActionActor {
  id: string;
  role: string;
}

/**
 * Fire-and-forget: dispatch side effects (email, webhooks) without blocking
 * the approval flow. Failures are logged but never propagated.
 */
function fireAndForget(fn: () => Promise<unknown>, label: string) {
  fn().catch((err) => logger.error({ err }, `Non-blocking side effect failed: ${label}`));
}

/**
 * Create a new submission and start the approval flow.
 */
export async function createSubmission(params: {
  workflowId: string;
  orgId: string;
  submittedBy: string;
  externalRef?: string;
  externalType?: string;
  payload?: Record<string, unknown>;
}) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: params.workflowId },
  });

  if (!workflow) throw new NotFoundError("Workflow");
  if (workflow.orgId !== params.orgId) {
    throw new AppError("Workflow does not belong to this organization", 403);
  }

  const steps = workflow.steps as unknown as WorkflowStep[];
  const now = new Date();

  const submission = await prisma.$transaction(async (tx) => {
    const sub = await tx.submission.create({
      data: {
        workflowId: params.workflowId,
        orgId: params.orgId,
        submittedBy: params.submittedBy,
        externalRef: params.externalRef,
        externalType: params.externalType,
        payload: (params.payload ?? {}) as any,
        status: "pending",
        currentStep: 1,
        stuckSince: now,
      },
    });

    if (steps.length > 0) {
      await createOrReplaceReminder(tx, sub.id, 1);
    }

    return sub;
  });

  // Fire-and-forget: notification after transaction commits
  if (steps.length > 0) {
    fireAndForget(
      () => sendApprovalNotification({ orgId: params.orgId, step: steps[0], submissionId: submission.id }),
      "createSubmission:notification"
    );
  }

  return submission;
}

/**
 * Approve the current step of a submission.
 * If this is the final step, mark submission as approved.
 * Wrapped in a transaction to prevent race conditions on concurrent approvals.
 */
export async function approveSubmission(
  submissionId: string,
  actor: ActionActor,
  comments?: string
) {
  const result = await prisma.$transaction(async (tx) => {
    const submission = await tx.submission.findUnique({
      where: { id: submissionId },
      include: { workflow: true },
    });

    if (!submission) throw new NotFoundError("Submission");
    if (submission.status !== "pending") {
      throw new AppError("Submission is not in a pending state");
    }

    const steps = submission.workflow.steps as unknown as WorkflowStep[];
    const currentStep = steps.find((s) => s.order === submission.currentStep);
    if (!currentStep) throw new AppError("Invalid workflow step");

    await tx.approvalAction.create({
      data: {
        submissionId,
        stepOrder: submission.currentStep,
        action: "approved",
        actor: actor.id,
        actorRole: actor.role,
        comments,
      },
    });

    const isLastStep = submission.currentStep >= steps.length;

    if (isLastStep) {
      const updated = await tx.submission.update({
        where: { id: submissionId },
        data: { status: "approved" },
      });

      await resolveActiveReminders(tx, submissionId);

      return { updated, submission, isLastStep, steps };
    } else {
      const nextStepOrder = submission.currentStep + 1;
      const updated = await tx.submission.update({
        where: { id: submissionId },
        data: { currentStep: nextStepOrder, stuckSince: new Date() },
      });

      await resolveActiveReminders(tx, submissionId);
      await createOrReplaceReminder(tx, submissionId, nextStepOrder);

      return { updated, submission, isLastStep, steps, nextStepOrder };
    }
  }, { maxWait: 5000, timeout: 10000 });

  // Fire-and-forget: side effects after transaction commits
  if (result.isLastStep) {
    fireAndForget(
      () => sendStatusNotification({
        orgId: result.submission.orgId,
        submittedBy: result.submission.submittedBy,
        submissionId,
        status: "approved",
      }),
      "approve:statusNotification"
    );
    fireAndForget(
      () => dispatchWebhookEvent(result.submission.orgId, "submission.approved", {
        submissionId,
        externalRef: result.submission.externalRef,
        externalType: result.submission.externalType,
      }),
      "approve:webhook"
    );
  } else {
    const nextStep = result.steps.find((s) => s.order === result.nextStepOrder);
    if (nextStep) {
      fireAndForget(
        () => sendApprovalNotification({
          orgId: result.submission.orgId,
          step: nextStep,
          submissionId,
        }),
        "approve:nextStepNotification"
      );
    }
    fireAndForget(
      () => dispatchWebhookEvent(result.submission.orgId, "step.completed", {
        submissionId,
        completedStep: result.submission.currentStep,
        nextStep: result.nextStepOrder,
      }),
      "approve:stepWebhook"
    );
  }

  return result.updated;
}

/**
 * Reject a submission. Terminates the approval flow.
 * Wrapped in a transaction for atomicity.
 */
export async function rejectSubmission(
  submissionId: string,
  actor: ActionActor,
  comments?: string
) {
  const result = await prisma.$transaction(async (tx) => {
    const submission = await tx.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) throw new NotFoundError("Submission");
    if (submission.status !== "pending") {
      throw new AppError("Submission is not in a pending state");
    }

    await tx.approvalAction.create({
      data: {
        submissionId,
        stepOrder: submission.currentStep,
        action: "rejected",
        actor: actor.id,
        actorRole: actor.role,
        comments,
      },
    });

    const updated = await tx.submission.update({
      where: { id: submissionId },
      data: { status: "rejected" },
    });

    await resolveActiveReminders(tx, submissionId);

    return { updated, submission };
  }, { maxWait: 5000, timeout: 10000 });

  // Fire-and-forget
  fireAndForget(
    () => sendStatusNotification({
      orgId: result.submission.orgId,
      submittedBy: result.submission.submittedBy,
      submissionId,
      status: "rejected",
      comments,
    }),
    "reject:statusNotification"
  );
  fireAndForget(
    () => dispatchWebhookEvent(result.submission.orgId, "submission.rejected", {
      submissionId,
      externalRef: result.submission.externalRef,
      externalType: result.submission.externalType,
      comments,
    }),
    "reject:webhook"
  );

  return result.updated;
}

/**
 * Send a submission back to the submitter for revision.
 * Resets to step 1. Wrapped in a transaction for atomicity.
 */
export async function sendBackSubmission(
  submissionId: string,
  actor: ActionActor,
  comments?: string
) {
  const result = await prisma.$transaction(async (tx) => {
    const submission = await tx.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) throw new NotFoundError("Submission");
    if (submission.status !== "pending") {
      throw new AppError("Submission is not in a pending state");
    }

    await tx.approvalAction.create({
      data: {
        submissionId,
        stepOrder: submission.currentStep,
        action: "sent_back",
        actor: actor.id,
        actorRole: actor.role,
        comments,
      },
    });

    const updated = await tx.submission.update({
      where: { id: submissionId },
      data: { status: "sent_back", currentStep: 1, stuckSince: new Date() },
    });

    await resolveActiveReminders(tx, submissionId);

    return { updated, submission };
  }, { maxWait: 5000, timeout: 10000 });

  // Fire-and-forget
  fireAndForget(
    () => sendStatusNotification({
      orgId: result.submission.orgId,
      submittedBy: result.submission.submittedBy,
      submissionId,
      status: "sent_back",
      comments,
    }),
    "sendBack:statusNotification"
  );
  fireAndForget(
    () => dispatchWebhookEvent(result.submission.orgId, "submission.sent_back", {
      submissionId,
      externalRef: result.submission.externalRef,
      externalType: result.submission.externalType,
      comments,
    }),
    "sendBack:webhook"
  );

  return result.updated;
}
