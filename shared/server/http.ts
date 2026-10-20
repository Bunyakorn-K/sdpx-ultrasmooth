import { AppError } from "@/shared/domain/app-error";
import { randomUUID } from "node:crypto";
import { logger, type RequestContext } from "./logger";
const codes: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMITED",
  503: "SERVICE_UNAVAILABLE",
};
export function requireSameOrigin(request: Request) {
  const expected =
    process.env.APP_ORIGIN ||
    `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`;
  if (request.headers.get("origin") !== expected)
    throw new AppError("คำขอไม่ถูกต้อง", 403);
}
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const maxBodyBytes = 128 * 1024;
  if (Number(request.headers.get("content-length")) > maxBodyBytes)
    throw new AppError("ข้อมูลมีขนาดใหญ่เกินไป", 413);
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBodyBytes)
    throw new AppError("ข้อมูลมีขนาดใหญ่เกินไป", 413);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AppError("JSON ไม่ถูกต้อง");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new AppError("ข้อมูลต้องเป็น JSON object");
  return parsed as Record<string, unknown>;
}
export function requireResourceId(value: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new AppError("รหัสทรัพยากรไม่ถูกต้อง");
  return value;
}
export function errorResponse(error: unknown) {
  const status = error instanceof AppError ? error.status : 503;
  const message =
    error instanceof AppError
      ? error.message
      : "ไม่สามารถดำเนินการได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูลแล้วลองใหม่";
  return Response.json(
    { error: message, code: codes[status] || "INTERNAL_ERROR" },
    { status },
  );
}
export function withApi(
  route: string,
  handler: (request: Request, context: RequestContext) => Promise<Response>,
) {
  return async (request: Request) => {
    const start = performance.now();
    const suppliedId = request.headers.get("x-request-id") || "";
    const context: RequestContext = {
      requestId: /^[0-9a-f-]{36}$/i.test(suppliedId)
        ? suppliedId
        : randomUUID(),
    };
    let response: Response;
    try {
      response = await handler(request, context);
    } catch (error) {
      response = errorResponse(error);
    }
    response.headers.set("x-request-id", context.requestId);
    response.headers.set("cache-control", "no-store");
    logger.info({
      event: "http_request",
      requestId: context.requestId,
      method: request.method,
      path: route,
      statusCode: response.status,
      userId: context.userId,
      duration_ms: Math.round((performance.now() - start) * 100) / 100,
    });
    return response;
  };
}
