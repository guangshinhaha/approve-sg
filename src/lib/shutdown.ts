import { prisma } from "./db";
import { logger } from "./logger";

let isShuttingDown = false;

export function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, "Received shutdown signal, closing connections...");

    try {
      await prisma.$disconnect();
      logger.info("Database disconnected");
    } catch (err) {
      logger.error({ err }, "Error disconnecting database");
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
