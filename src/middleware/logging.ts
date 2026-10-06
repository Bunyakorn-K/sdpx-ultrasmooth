import { randomUUID } from "node:crypto";
import { logger } from "#/lib/logger";

export function getRequestId(request: Request): string {
  const candidate = request.headers.get("x-request-id");
  return candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : randomUUID();
}

interface RequestLog {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userId?: number;
}

export function logRequest({ durationMs, ...fields }: RequestLog) {
  logger.info({ event: "http_request", ...fields, duration_ms: durationMs });
}