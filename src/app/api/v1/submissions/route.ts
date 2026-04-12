import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiKey, requireScope } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createSubmission } from "@/lib/routing";
import { handleApiError } from "@/lib/errors";

const CreateSubmissionSchema = z.object({
  workflowId: z.string().uuid(),
  submittedBy: z.string().min(1).max(255),
  externalRef: z.string().optional(),
  externalType: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

/**
 * POST /api/v1/submissions — Create a submission on behalf of a user in the host product.
 * Requires scope: submissions:write
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "submissions:write");

    const body = await req.json();
    const data = CreateSubmissionSchema.parse(body);

    const submission = await createSubmission({
      workflowId: data.workflowId,
      orgId: ctx.orgId,
      submittedBy: data.submittedBy,
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
 * GET /api/v1/submissions — List submissions for the caller's organization.
 * Requires scope: submissions:read
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "submissions:read", "submissions:write");

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const workflowId = searchParams.get("workflowId");
    const submittedBy = searchParams.get("submittedBy");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (status) where.status = status;
    if (workflowId) where.workflowId = workflowId;
    if (submittedBy) where.submittedBy = submittedBy;

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
