import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, enforceOrgAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSubmission } from "@/lib/routing";
import { handleApiError } from "@/lib/errors";

const CreateSubmissionSchema = z.object({
  workflowId: z.string().uuid(),
  externalRef: z.string().optional(),
  externalType: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

/**
 * POST /api/submissions — Create a new submission
 */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    const body = await req.json();
    const data = CreateSubmissionSchema.parse(body);

    const submission = await createSubmission({
      workflowId: data.workflowId,
      orgId: user.orgId,
      submittedBy: user.userId,
      externalRef: data.externalRef,
      externalType: data.externalType,
      payload: data.payload,
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/submissions — List submissions for the current user's school
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const workflowId = searchParams.get("workflowId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    const where: Record<string, unknown> = {
      orgId: user.orgId,
    };

    if (status) where.status = status;
    if (workflowId) where.workflowId = workflowId;

    // Submitters only see their own; approvers and admins see all for school
    if (user.role === "submitter") {
      where.submittedBy = user.userId;
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        select: {
          id: true,
          orgId: true,
          workflowId: true,
          externalRef: true,
          externalType: true,
          status: true,
          currentStep: true,
          stuckSince: true,
          submittedBy: true,
          submittedAt: true,
          updatedAt: true,
          payload: true,
          workflow: { select: { id: true, name: true, workflowType: true } },
        },
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.submission.count({ where }),
    ]);

    return NextResponse.json({
      data: submissions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
