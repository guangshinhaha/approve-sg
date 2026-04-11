import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiKey, requireScope } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { approveSubmission } from "@/lib/routing";
import { handleApiError, NotFoundError, AppError } from "@/lib/errors";

const ApproveSchema = z.object({
  actor: z.string().min(1).max(255),
  actorRole: z.string().min(1).max(100).optional(),
  comments: z.string().optional(),
});

/**
 * POST /api/v1/submissions/:id/approve — Record an approval on behalf of a
 * host-product user. The `actor` and `actorRole` identify who acted.
 * Requires scope: submissions:approve
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "submissions:approve");

    const body = await req.json().catch(() => ({}));
    const data = ApproveSchema.parse(body);

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    });
    if (!submission) throw new NotFoundError("Submission");
    if (submission.orgId !== ctx.orgId) {
      throw new AppError("Submission does not belong to this organization", 403);
    }

    const updated = await approveSubmission(
      params.id,
      { id: data.actor, role: data.actorRole ?? "approver" },
      data.comments
    );
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
