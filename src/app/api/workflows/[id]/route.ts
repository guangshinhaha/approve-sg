import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, enforceOrgAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, AppError, NotFoundError } from "@/lib/errors";

const StepSchema = z.object({
  order: z.number().int().positive(),
  label: z.string().min(1),
  approver_role: z.string().min(1),
  required: z.boolean(),
});

const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  steps: z.array(StepSchema).min(1).optional(),
  active: z.boolean().optional(),
});

/**
 * GET /api/workflows/:id — Get a single workflow configuration
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);

    const workflow = await prisma.workflow.findUnique({
      where: { id: params.id },
    });

    if (!workflow) throw new NotFoundError("Workflow");
    enforceOrgAccess(user, workflow.orgId);

    return NextResponse.json(workflow);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/workflows/:id — Update workflow config (school admin only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);

    if (user.role !== "school_admin" && user.role !== "platform_admin") {
      throw new AppError("Only school admins can update workflows", 403);
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id: params.id },
    });

    if (!workflow) throw new NotFoundError("Workflow");
    enforceOrgAccess(user, workflow.orgId);

    const body = await req.json();
    const data = UpdateWorkflowSchema.parse(body);

    const updated = await prisma.workflow.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.steps && { steps: data.steps }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
