import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth, enforceSchoolAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendBackSubmission } from "@/lib/routing";
import { handleApiError, NotFoundError } from "@/lib/errors";

const SendBackSchema = z.object({
  comments: z.string().optional(),
});

/**
 * POST /api/submissions/:id/send-back — Send back to submitter
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(req);
    const body = await req.json().catch(() => ({}));
    const data = SendBackSchema.parse(body);

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    });
    if (!submission) throw new NotFoundError("Submission");
    enforceSchoolAccess(user, submission.schoolCode);

    const updated = await sendBackSubmission(params.id, user, data.comments);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
