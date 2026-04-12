import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmbedAuth } from "@/lib/embed-api-auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";

const StepSchema = z.object({
  order: z.number().int().positive(),
  label: z.string().min(1),
  approver_role: z.string().min(1),
  required: z.boolean(),
});

const CreateWorkflowSchema = z.object({
  workflowType: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  steps: z.array(StepSchema).min(1),
});

/**
 * GET /api/embed/workflows — List active workflows for the embed user's org.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyEmbedAuth(req);

    const workflows = await prisma.workflow.findMany({
      where: { orgId: user.orgId, active: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: workflows });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/embed/workflows — Create a workflow from the embed UI.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyEmbedAuth(req);

    const body = await req.json();
    const data = CreateWorkflowSchema.parse(body);

    const workflow = await prisma.workflow.create({
      data: {
        orgId: user.orgId,
        workflowType: data.workflowType,
        name: data.name,
        steps: data.steps,
        createdBy: `embed:${user.email}`,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
