import { NextRequest, NextResponse } from "next/server";
import { verifyEmbedAuth } from "@/lib/embed-api-auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";

interface WorkflowStep {
  order: number;
  label: string;
  approver_role: string;
  required: boolean;
}

/**
 * GET /api/embed/inbox — Submissions waiting on the current embed user.
 *
 * Finds pending submissions where the current step's approver_role matches
 * one of the embed user's roles (resolved via OrgMember lookup).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyEmbedAuth(req);

    // Resolve the embed user's roles from OrgMember
    const member = await prisma.orgMember.findFirst({
      where: { orgId: user.orgId, email: user.email },
      select: { roles: true },
    });

    const userRoles = member?.roles ?? [user.role];

    // Get all pending submissions in this org with their workflows
    const submissions = await prisma.submission.findMany({
      where: { orgId: user.orgId, status: "pending" },
      include: { workflow: true },
      orderBy: { stuckSince: "asc" },
    });

    // Filter to submissions where the current step's approver_role
    // matches one of the user's roles
    const inbox = submissions.filter((sub) => {
      const steps = sub.workflow.steps as unknown as WorkflowStep[];
      const currentStepDef = steps.find((s) => s.order === sub.currentStep);
      return currentStepDef && userRoles.includes(currentStepDef.approver_role);
    });

    const result = inbox.map((sub) => {
      const steps = sub.workflow.steps as unknown as WorkflowStep[];
      const currentStepDef = steps.find((s) => s.order === sub.currentStep)!;
      const stuckMs = sub.stuckSince
        ? Date.now() - new Date(sub.stuckSince).getTime()
        : 0;

      return {
        id: sub.id,
        workflowName: sub.workflow.name,
        workflowType: sub.workflow.workflowType,
        externalRef: sub.externalRef,
        externalType: sub.externalType,
        currentStep: sub.currentStep,
        totalSteps: steps.length,
        stepLabel: currentStepDef.label,
        approverRole: currentStepDef.approver_role,
        submittedBy: sub.submittedBy,
        submittedAt: sub.submittedAt.toISOString(),
        stuckSince: sub.stuckSince?.toISOString() ?? null,
        stuckForMs: stuckMs,
      };
    });

    return NextResponse.json({ data: result, total: result.length });
  } catch (error) {
    return handleApiError(error);
  }
}
