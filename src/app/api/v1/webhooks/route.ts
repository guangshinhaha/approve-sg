import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { verifyApiKey, requireScope } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";

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
 * POST /api/v1/webhooks — Register a webhook for this organization.
 * Returns the HMAC secret once — store it. Requires scope: webhooks:write
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "webhooks:write");

    const body = await req.json();
    const data = CreateWebhookSchema.parse(body);

    const secret = randomBytes(32).toString("hex");

    const webhook = await prisma.webhookRegistration.create({
      data: {
        orgId: ctx.orgId,
        url: data.url,
        events: data.events,
        secret,
        createdBy: `api_key:${ctx.apiKeyId}`,
      },
    });

    return NextResponse.json({ ...webhook, secret }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/v1/webhooks — List webhooks for this organization. Omits secrets.
 * Requires scope: webhooks:read
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await verifyApiKey(req);
    requireScope(ctx, "webhooks:read", "webhooks:write");

    const webhooks = await prisma.webhookRegistration.findMany({
      where: { orgId: ctx.orgId },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: webhooks });
  } catch (error) {
    return handleApiError(error);
  }
}
