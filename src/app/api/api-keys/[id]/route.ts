import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, AppError, NotFoundError } from "@/lib/errors";

/**
 * DELETE /api/api-keys/:id — Revoke an API key (soft delete via revokedAt).
 * Admins only.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);
    if (user.role !== "school_admin" && user.role !== "platform_admin") {
      throw new AppError("Only admins can revoke API keys", 403);
    }

    const key = await prisma.apiKey.findUnique({ where: { id: params.id } });
    if (!key) throw new NotFoundError("API key");
    if (key.orgId !== user.orgId) {
      throw new AppError("API key does not belong to this organization", 403);
    }

    await prisma.apiKey.update({
      where: { id: params.id },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
