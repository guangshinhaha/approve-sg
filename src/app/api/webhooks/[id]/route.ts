import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, enforceSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, AppError, NotFoundError } from "@/lib/errors";

/**
 * DELETE /api/webhooks/:id — Remove a webhook registration
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);

    if (user.role !== "school_admin" && user.role !== "platform_admin") {
      throw new AppError("Only school admins can delete webhooks", 403);
    }

    const webhook = await prisma.webhookRegistration.findUnique({
      where: { id: params.id },
    });

    if (!webhook) throw new NotFoundError("Webhook");
    enforceSchoolAccess(user, webhook.schoolCode);

    await prisma.webhookRegistration.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
