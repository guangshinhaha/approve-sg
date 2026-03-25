import { prisma } from "./db";
import { createHmac } from "crypto";

/**
 * Dispatch a webhook event to all registered listeners for a school.
 */
export async function dispatchWebhookEvent(
  schoolCode: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const registrations = await prisma.webhookRegistration.findMany({
    where: {
      schoolCode,
      active: true,
      events: { has: event },
    },
  });

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

  await Promise.allSettled(
    registrations.map(async (reg) => {
      const signature = createHmac("sha256", reg.secret).update(body).digest("hex");

      try {
        await fetch(reg.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ApproveSG-Signature": signature,
            "X-ApproveSG-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });
      } catch (err) {
        console.error(`[Webhook] Failed to deliver to ${reg.url}:`, err);
      }
    })
  );
}
