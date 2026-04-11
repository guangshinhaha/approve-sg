import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiKey, requireScope } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/errors";

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
 * GET /api/v1/workflows — List active workflows for the caller's organization.
 * Requires scope: workflows:read
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "workflows:read", "workflows:write");

    const workflows = await prisma.workflow.findMany({
      where: { orgId: ctx.orgId, active: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: workflows });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/workflows — Create a workflow definition.
 * Requires scope: workflows:write
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "workflows:write");

    const body = await req.json();
    const data = CreateWorkflowSchema.parse(body);

    const existing = await prisma.workflow.findUnique({
      where: {
        orgId_workflowType: {
          orgId: ctx.orgId,
          workflowType: data.workflowType,
        },
      },
    });
    if (existing) {
      throw new AppError(
        `Workflow type "${data.workflowType}" already exists for this organization`,
        409
      );
    }

    const workflow = await prisma.workflow.create({
      data: {
        orgId: ctx.orgId,
        workflowType: data.workflowType,
        name: data.name,
        steps: data.steps,
        createdBy: `api_key:${ctx.apiKeyId}`,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
