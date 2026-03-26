import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
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
 * GET /api/workflows — List configured workflows for the user's school
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);

    const workflows = await prisma.workflow.findMany({
      where: { schoolCode: user.schoolCode, active: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: workflows });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/workflows — Create a new workflow configuration (school admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);

    if (user.role !== "school_admin" && user.role !== "platform_admin") {
      throw new AppError("Only school admins can create workflows", 403);
    }

    const body = await req.json();
    const data = CreateWorkflowSchema.parse(body);

    // Check for duplicate workflow type in this school
    const existing = await prisma.workflow.findUnique({
      where: {
        schoolCode_workflowType: {
          schoolCode: user.schoolCode,
          workflowType: data.workflowType,
        },
      },
    });

    if (existing) {
      throw new AppError(
        `Workflow type "${data.workflowType}" already exists for this school`,
        409
      );
    }

    const workflow = await prisma.workflow.create({
      data: {
        schoolCode: user.schoolCode,
        workflowType: data.workflowType,
        name: data.name,
        steps: data.steps,
        createdBy: user.userId,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
