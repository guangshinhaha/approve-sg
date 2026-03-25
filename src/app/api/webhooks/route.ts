import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, AppError } from "@/lib/errors";

const VALID_EVENTS = [
  "submission.approved",
  "submission.rejected",
  "submission.sent_back",
  "step.completed",
];

const CreateWebhookSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.enum(VALID_EVENTS as [string, ...string[]])).min(1),
});

/**
 * POST /api/webhooks — Register a webhook
 */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);

    if (user.role !== "school_admin" && user.role !== "platform_admin") {
      throw new AppError("Only school admins can register webhooks", 403);
    }

    const body = await req.json();
    const data = CreateWebhookSchema.parse(body);

    const secret = randomBytes(32).toString("hex");

    const webhook = await prisma.webhookRegistration.create({
      data: {
        schoolCode: user.schoolCode,
        url: data.url,
        events: data.events,
        secret,
        createdBy: user.userId,
      },
    });

    return NextResponse.json(
      { ...webhook, secret },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/webhooks — List webhooks for the school
 */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyAuth(req);

    const webhooks = await prisma.webhookRegistration.findMany({
      where: { schoolCode: user.schoolCode },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
        // Exclude secret from list responses
      },
    });

    return NextResponse.json({ data: webhooks });
  } catch (error) {
    return handleApiError(error);
  }
}
