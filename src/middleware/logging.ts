import { randomUUID } from "node:crypto";
import { logger } from "#/lib/logger";

export function withRequestLogging<Context>(
  route: string,
  handler: (request: Request, context: Context) => Promise<Response>,
) {
  return async (request: Request, context: Context) => {
    const start = Date.now();
    const incoming = request.headers.get("x-request-id") ?? "";
    const requestId = /^[a-zA-Z0-9_-]{1,80}$/.test(incoming) ? incoming : randomUUID();
    try {
      const response = await handler(request, context);
      response.headers.set("x-request-id", requestId);
      logger.info({ event: "http_request", requestId, method: request.method,
        route, statusCode: response.status, duration_ms: Date.now() - start });
      return response;
    } catch {
      logger.error({ event: "http_request_failed", requestId, method: request.method,
        route, statusCode: 500, duration_ms: Date.now() - start });
      return Response.json({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed." } },
        { status: 500, headers: { "x-request-id": requestId } });
    }
  };
}
