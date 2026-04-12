import { runChaseCycle } from "./chase";
import { logger } from "./logger";

const CHASE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the internal chase scheduler. Runs runChaseCycle() every hour
 * inside the main app process — no external cron service needed.
 *
 * First run is delayed by 30 seconds to let the app fully start up.
 * Subsequent runs every hour. Idempotent: safe to call multiple times.
 */
export function startChaseScheduler() {
  if (timer) return; // already running
  if (process.env.NODE_ENV !== "production" && !process.env.ENABLE_CHASE_SCHEDULER) {
    logger.info("Chase scheduler disabled (non-production). Set ENABLE_CHASE_SCHEDULER=1 to enable locally.");
    return;
  }

  logger.info("Chase scheduler starting (interval: 1h)");

  // Initial run after 30s startup delay
  setTimeout(async () => {
    await runCycle();
    // Then every hour
    timer = setInterval(runCycle, CHASE_INTERVAL_MS);
  }, 30_000);
}

async function runCycle() {
  try {
    logger.info("Chase scheduler: starting cycle");
    const result = await runChaseCycle();
    logger.info(result, "Chase scheduler: cycle complete");
  } catch (err) {
    logger.error({ err }, "Chase scheduler: cycle failed (will retry next interval)");
  }
}

export function stopChaseScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info("Chase scheduler stopped");
  }
}
