import pino, { type DestinationStream } from "pino";

export function createLogger(destination?: DestinationStream) {
  const options = {
    level: process.env.LOG_LEVEL || "info",
    base: undefined,
    redact: {
      paths: [
        "password",
        "password_hash",
        "token",
        "email",
        "authorization",
        "cookie",
        "*.password",
        "*.password_hash",
        "*.token",
        "*.email",
        "req.headers.authorization",
        "req.headers.cookie",
      ],
      censor: "[REDACTED]",
    },
  };
  return destination ? pino(options, destination) : pino(options);
}
export const logger = createLogger();
export type RequestContext = { requestId: string; userId?: string };
export function logBusinessEvent(
  event: string,
  context: RequestContext,
  durationMs: number,
  resourceId?: string,
) {
  logger.info({
    event,
    requestId: context.requestId,
    userId: context.userId,
    resourceId,
    duration_ms: Math.round(durationMs * 100) / 100,
  });
}
