import { prisma } from "./db";
import { AppError, NotFoundError } from "./errors";
import { dispatchWebhookEvent } from "./webhooks";
import { sendApprovalNotification, sendStatusNotification } from "./notifications";
import { CHASE_INTERVAL_HOURS } from "./constants";

function nextChaseDueAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + CHASE_INTERVAL_HOURS * 60 * 60 * 1000);
}

async function createOrReplaceReminder(submissionId: string, stepOrder: number) {
  // One active reminder per (submission, step). Upsert handles re-entry after send-back.
  await prisma.chaseReminder.upsert({
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

async function resolveActiveReminders(submissionId: string) {
  await prisma.chaseReminder.updateMany({
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

  const now = new Date();
  const submission = await prisma.submission.create({
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

  const steps = workflow.steps as unknown as WorkflowStep[];
  if (steps.length > 0) {
    await createOrReplaceReminder(submission.id, 1);
    await sendApprovalNotification({
      orgId: params.orgId,
      step: steps[0],
      submissionId: submission.id,
    });
  }

  return submission;
}

/**
 * Approve the current step of a submission.
 * If this is the final step, mark submission as approved.
 */
export async function approveSubmission(
  submissionId: string,
  actor: ActionActor,
  comments?: string
) {
  const submission = await prisma.submission.findUnique({
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

  // Log the approval action
  await prisma.approvalAction.create({
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
    // Final approval — mark complete
    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "approved" },
    });

    await resolveActiveReminders(submissionId);

    await sendStatusNotification({
      orgId: submission.orgId,
      submittedBy: submission.submittedBy,
      submissionId,
      status: "approved",
    });

    await dispatchWebhookEvent(submission.orgId, "submission.approved", {
      submissionId,
      externalRef: submission.externalRef,
      externalType: submission.externalType,
    });

    return updated;
  } else {
    // Advance to next step
    const nextStepOrder = submission.currentStep + 1;
    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: { currentStep: nextStepOrder, stuckSince: new Date() },
    });

    await resolveActiveReminders(submissionId);
    await createOrReplaceReminder(submissionId, nextStepOrder);

    const nextStep = steps.find((s) => s.order === nextStepOrder);
    if (nextStep) {
      await sendApprovalNotification({
        orgId: submission.orgId,
        step: nextStep,
        submissionId,
      });
    }

    await dispatchWebhookEvent(submission.orgId, "step.completed", {
      submissionId,
      completedStep: submission.currentStep,
      nextStep: nextStepOrder,
    });

    return updated;
  }
}

/**
 * Reject a submission. Terminates the approval flow.
 */
export async function rejectSubmission(
  submissionId: string,
  actor: ActionActor,
  comments?: string
) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) throw new NotFoundError("Submission");
  if (submission.status !== "pending") {
    throw new AppError("Submission is not in a pending state");
  }

  await prisma.approvalAction.create({
    data: {
      submissionId,
      stepOrder: submission.currentStep,
      action: "rejected",
      actor: actor.id,
      actorRole: actor.role,
      comments,
    },
  });

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "rejected" },
  });

  await resolveActiveReminders(submissionId);

  await sendStatusNotification({
    orgId: submission.orgId,
    submittedBy: submission.submittedBy,
    submissionId,
    status: "rejected",
    comments,
  });

  await dispatchWebhookEvent(submission.orgId, "submission.rejected", {
    submissionId,
    externalRef: submission.externalRef,
    externalType: submission.externalType,
    comments,
  });

  return updated;
}

/**
 * Send a submission back to the submitter for revision.
 * Resets to step 0 (submitter).
 */
export async function sendBackSubmission(
  submissionId: string,
  actor: ActionActor,
  comments?: string
) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) throw new NotFoundError("Submission");
  if (submission.status !== "pending") {
    throw new AppError("Submission is not in a pending state");
  }

  await prisma.approvalAction.create({
    data: {
      submissionId,
      stepOrder: submission.currentStep,
      action: "sent_back",
      actor: actor.id,
      actorRole: actor.role,
      comments,
    },
  });

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "sent_back", currentStep: 1, stuckSince: new Date() },
  });

  // Send-back hands the ball back to the submitter, so stop chasing approvers.
  // If the submitter re-submits, createSubmission starts a new reminder.
  await resolveActiveReminders(submissionId);

  await sendStatusNotification({
    orgId: submission.orgId,
    submittedBy: submission.submittedBy,
    submissionId,
    status: "sent_back",
    comments,
  });

  await dispatchWebhookEvent(submission.orgId, "submission.sent_back", {
    submissionId,
    externalRef: submission.externalRef,
    externalType: submission.externalType,
    comments,
  });

  return updated;
}
