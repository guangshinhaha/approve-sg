import { prisma } from "./db";
import { createHmac } from "crypto";
import { logger } from "./logger";
import { WEBHOOK_TIMEOUT_MS, WEBHOOK_MAX_RETRIES } from "./constants";

/**
 * Dispatch a webhook event to all registered listeners for an organization.
 * Includes exponential backoff retry (up to 3 attempts).
 */
export async function dispatchWebhookEvent(
  orgId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const registrations = await prisma.webhookRegistration.findMany({
    where: {
      orgId,
      active: true,
      events: { has: event },
    },
  });

  if (registrations.length === 0) return;

  const body = JSON.stringify({
    event,
    data: payload,
    timestamp: new Date().toISOString(),
  });

  await Promise.allSettled(
    registrations.map((reg) => deliverWithRetry(reg.url, reg.secret, event, body))
  );
}

async function deliverWithRetry(
  url: string,
  secret: string,
  event: string,
  body: string
): Promise<void> {
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  for (let attempt = 1; attempt <= WEBHOOK_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ApproveSG-Signature": signature,
          "X-ApproveSG-Event": event,
        },
        body,
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });

      if (response.ok) {
        logger.info({ url, event, attempt }, "Webhook delivered");
        return;
      }

      logger.warn(
        { url, event, attempt, status: response.status },
        "Webhook delivery failed with non-OK status"
      );
    } catch (err) {
      logger.warn({ url, event, attempt, err }, "Webhook delivery error");
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < WEBHOOK_MAX_RETRIES) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
      );
    }
  }

  logger.error(
    { url, event, maxRetries: WEBHOOK_MAX_RETRIES },
    "Webhook delivery failed after all retries"
  );
}
