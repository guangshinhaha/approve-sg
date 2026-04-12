/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Used to start the internal chase scheduler so we don't need
 * a separate cron service.
 */
export async function register() {
  // Only run on the server, not during build or edge runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startChaseScheduler } = await import("./lib/chase-scheduler");
    startChaseScheduler();
  }
}
