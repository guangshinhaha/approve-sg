import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, requireScope } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, AppError } from "@/lib/errors";

/**
 * GET /api/v1/workflows/:id — Fetch a single workflow.
 * Requires scope: workflows:read
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "workflows:read", "workflows:write");

    const workflow = await prisma.workflow.findUnique({
      where: { id: params.id },
    });
    if (!workflow) throw new NotFoundError("Workflow");
    if (workflow.orgId !== ctx.orgId) {
      throw new AppError("Workflow does not belong to this organization", 403);
    }

    return NextResponse.json(workflow);
  } catch (error) {
    return handleApiError(error);
  }
}
