import { withApi } from "@/shared/server/http";
export const GET = withApi("/api/health", async () =>
  Response.json({ status: "ok", service: "peerly" }),
);
