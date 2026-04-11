import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, requireScope } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, AppError } from "@/lib/errors";
import { WorkflowStep } from "@/types";

/**
 * GET /api/v1/submissions/:id — Fetch submission status and full history,
 * including a computed "stuckWith" field that tells host products exactly
 * which approver role the flow is currently waiting on.
 *
 * Requires scope: submissions:read
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "submissions:read", "submissions:write");

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: {
        workflow: true,
        actions: { orderBy: { actedAt: "asc" } },
      },
    });

    if (!submission) throw new NotFoundError("Submission");
    if (submission.orgId !== ctx.orgId) {
      throw new AppError("Submission does not belong to this organization", 403);
    }

    const steps = submission.workflow.steps as unknown as WorkflowStep[];
    const currentStepConfig = steps.find((s) => s.order === submission.currentStep);

    const stuckWith =
      submission.status === "pending" && currentStepConfig
        ? {
            stepOrder: currentStepConfig.order,
            stepLabel: currentStepConfig.label,
            approverRole: currentStepConfig.approver_role,
            sinceLastAction:
              submission.actions.length > 0
                ? submission.actions[submission.actions.length - 1].actedAt
                : submission.submittedAt,
          }
        : null;

    return NextResponse.json({
      id: submission.id,
      orgId: submission.orgId,
      workflowId: submission.workflowId,
      workflowName: submission.workflow.name,
      externalRef: submission.externalRef,
      externalType: submission.externalType,
      payload: submission.payload,
      status: submission.status,
      currentStep: submission.currentStep,
      totalSteps: steps.length,
      currentStepLabel: currentStepConfig?.label ?? null,
      stuckWith,
      submittedBy: submission.submittedBy,
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
      actions: submission.actions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
