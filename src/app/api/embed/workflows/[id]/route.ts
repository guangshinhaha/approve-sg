import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmbedAuth } from "@/lib/embed-api-auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, AppError } from "@/lib/errors";

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
 * GET /api/embed/workflows/:id — Fetch a single workflow.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyEmbedAuth(req);

    const workflow = await prisma.workflow.findUnique({
      where: { id: params.id },
    });
    if (!workflow) throw new NotFoundError("Workflow");
    if (workflow.orgId !== user.orgId) {
      throw new AppError("Workflow does not belong to this organization", 403);
    }

    return NextResponse.json(workflow);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/embed/workflows/:id — Update workflow from the embed builder.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyEmbedAuth(req);

    const workflow = await prisma.workflow.findUnique({
      where: { id: params.id },
    });
    if (!workflow) throw new NotFoundError("Workflow");
    if (workflow.orgId !== user.orgId) {
      throw new AppError("Workflow does not belong to this organization", 403);
    }

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
