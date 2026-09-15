import { NextResponse } from "next/server";

// FR-API-03: every error has a machine-stable `code`, separate from the
// human-readable `message`. See docs/openapi.yaml for the schema.
export function apiError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export const unauthorized = () => apiError(401, "UNAUTHORIZED", "Sign in required.");
// FR-AUTHZ-02: a resource outside the caller's classroom scope reads as 404,
// never 403, so the caller can't infer that the resource exists elsewhere.
export const notFound = (message = "Not found.") => apiError(404, "NOT_FOUND", message);
