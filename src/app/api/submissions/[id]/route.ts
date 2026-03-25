import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, enforceSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { WorkflowStep } from "@/types";

/**
 * GET /api/submissions/:id — Get submission status and full history
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: {
        workflow: true,
        actions: { orderBy: { actedAt: "asc" } },
      },
    });

    if (!submission) throw new NotFoundError("Submission");
    enforceSchoolAccess(user, submission.schoolCode);

    const steps = submission.workflow.steps as WorkflowStep[];
    const currentStepConfig = steps.find((s) => s.order === submission.currentStep);

    return NextResponse.json({
      id: submission.id,
      workflowId: submission.workflowId,
      workflowName: submission.workflow.name,
      schoolCode: submission.schoolCode,
      externalRef: submission.externalRef,
      externalType: submission.externalType,
      payload: submission.payload,
      status: submission.status,
      currentStep: submission.currentStep,
      totalSteps: steps.length,
      currentStepLabel: currentStepConfig?.label ?? null,
      submittedBy: submission.submittedBy,
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
      actions: submission.actions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
