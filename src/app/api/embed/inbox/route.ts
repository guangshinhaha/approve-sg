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
 * Capped at 200 rows to prevent memory overload at scale.
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

    // Fetch pending submissions with only needed fields (capped at 200)
    const submissions = await prisma.submission.findMany({
      where: { orgId: user.orgId, status: "pending" },
      select: {
        id: true,
        currentStep: true,
        externalRef: true,
        externalType: true,
        submittedBy: true,
        submittedAt: true,
        stuckSince: true,
        workflow: { select: { name: true, workflowType: true, steps: true } },
      },
      orderBy: { stuckSince: "asc" },
      take: 200,
    });

    // Filter to submissions where the current step's approver_role
    // matches one of the user's roles
    const result = [];
    for (const sub of submissions) {
      const steps = sub.workflow.steps as unknown as WorkflowStep[];
      const currentStepDef = steps.find((s) => s.order === sub.currentStep);
      if (!currentStepDef || !userRoles.includes(currentStepDef.approver_role)) continue;

      const stuckMs = sub.stuckSince
        ? Date.now() - new Date(sub.stuckSince).getTime()
        : 0;

      result.push({
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
      });
    }

    return NextResponse.json({ data: result, total: result.length });
  } catch (error) {
    return handleApiError(error);
  }
}
