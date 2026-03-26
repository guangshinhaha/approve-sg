import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: { service: "approvesg" },
});

export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
