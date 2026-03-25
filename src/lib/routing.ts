import { prisma } from "./db";
import { AppError, NotFoundError } from "./errors";
import { AuthUser } from "./auth";
import { dispatchWebhookEvent } from "./webhooks";
import { sendApprovalNotification, sendStatusNotification } from "./notifications";

interface WorkflowStep {
  order: number;
  label: string;
  approver_role: string;
  required: boolean;
}

/**
 * Create a new submission and start the approval flow.
 */
export async function createSubmission(params: {
  workflowId: string;
  schoolCode: string;
  submittedBy: string;
  externalRef?: string;
  externalType?: string;
  payload?: Record<string, unknown>;
}) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: params.workflowId },
  });

  if (!workflow) throw new NotFoundError("Workflow");
  if (workflow.schoolCode !== params.schoolCode) {
    throw new AppError("Workflow does not belong to this school", 403);
  }

  const submission = await prisma.submission.create({
    data: {
      workflowId: params.workflowId,
      schoolCode: params.schoolCode,
      submittedBy: params.submittedBy,
      externalRef: params.externalRef,
      externalType: params.externalType,
      payload: params.payload ?? {},
      status: "pending",
      currentStep: 1,
    },
  });

  const steps = workflow.steps as WorkflowStep[];
  if (steps.length > 0) {
    await sendApprovalNotification({
      schoolCode: params.schoolCode,
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
  user: AuthUser,
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

  const steps = submission.workflow.steps as WorkflowStep[];
  const currentStep = steps.find((s) => s.order === submission.currentStep);
  if (!currentStep) throw new AppError("Invalid workflow step");

  // Log the approval action
  await prisma.approvalAction.create({
    data: {
      submissionId,
      stepOrder: submission.currentStep,
      action: "approved",
      actor: user.userId,
      actorRole: user.role,
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

    await sendStatusNotification({
      schoolCode: submission.schoolCode,
      submittedBy: submission.submittedBy,
      submissionId,
      status: "approved",
    });

    await dispatchWebhookEvent(submission.schoolCode, "submission.approved", {
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
      data: { currentStep: nextStepOrder },
    });

    const nextStep = steps.find((s) => s.order === nextStepOrder);
    if (nextStep) {
      await sendApprovalNotification({
        schoolCode: submission.schoolCode,
        step: nextStep,
        submissionId,
      });
    }

    await dispatchWebhookEvent(submission.schoolCode, "step.completed", {
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
  user: AuthUser,
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
      actor: user.userId,
      actorRole: user.role,
      comments,
    },
  });

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "rejected" },
  });

  await sendStatusNotification({
    schoolCode: submission.schoolCode,
    submittedBy: submission.submittedBy,
    submissionId,
    status: "rejected",
    comments,
  });

  await dispatchWebhookEvent(submission.schoolCode, "submission.rejected", {
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
  user: AuthUser,
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
      actor: user.userId,
      actorRole: user.role,
      comments,
    },
  });

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "sent_back", currentStep: 1 },
  });

  await sendStatusNotification({
    schoolCode: submission.schoolCode,
    submittedBy: submission.submittedBy,
    submissionId,
    status: "sent_back",
    comments,
  });

  await dispatchWebhookEvent(submission.schoolCode, "submission.sent_back", {
    submissionId,
    externalRef: submission.externalRef,
    externalType: submission.externalType,
    comments,
  });

  return updated;
}
