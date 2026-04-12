import { Redis } from "@upstash/redis";
import { logger } from "./logger";

/**
 * Upstash Redis client — used for distributed rate limiting and caching.
 * Falls back gracefully to null if env vars aren't configured, so the app
 * works without Redis (using in-memory fallbacks).
 */
export const redis: Redis | null = (() => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    logger.info("Redis not configured (UPSTASH_REDIS_REST_URL missing). Using in-memory fallbacks.");
    return null;
  }

  return new Redis({ url, token });
})();
