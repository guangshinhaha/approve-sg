import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/errors";
import { ADMIN_ROLES } from "@/lib/constants";

/**
 * GET /api/audit-trail — Query audit trail for a school
 * Filters: submissionId, actor, action, dateFrom, dateTo
 * Access: school_admin and platform_admin only
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);

    if (!ADMIN_ROLES.includes(user.role)) {
      throw new AppError("Only admins can access audit trail", 403);
    }

    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get("submissionId");
    const actor = searchParams.get("actor");
    const action = searchParams.get("action");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const where: Record<string, unknown> = {
      submission: { orgId: user.orgId },
    };

    if (submissionId) where.submissionId = submissionId;
    if (actor) where.actor = actor;
    if (action) where.action = action;
    if (dateFrom || dateTo) {
      where.actedAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    const [actions, total] = await Promise.all([
      prisma.approvalAction.findMany({
        where,
        include: {
          submission: {
            select: {
              id: true,
              externalRef: true,
              externalType: true,
              status: true,
            },
          },
        },
        orderBy: { actedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.approvalAction.count({ where }),
    ]);

    return NextResponse.json({
      data: actions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
