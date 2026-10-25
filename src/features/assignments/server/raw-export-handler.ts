import { requireUser } from "@/features/auth/server/session-service";
import { AuditService } from "@/features/audit/server/audit-service";
import { PostgresClassroomRepository } from "@/features/classroom/server/classroom-repository";
import {
  readJsonObject,
  requireResourceId,
  requireSameOrigin,
  withApi,
} from "@/shared/server/http";
import { PostgresExportIdentityRepository } from "../data/export-identity-repository";
import { PostgresAssignmentRepository } from "./assignment-repository";
import { RawExportService } from "./raw-export-service";

const exports = new RawExportService(
  new PostgresAssignmentRepository(),
  new PostgresExportIdentityRepository(),
  new AuditService(),
  new PostgresClassroomRepository(),
);
export function rawExportResponse(request: Request, id: string) {
  return withApi("/api/assignments/:id/exports/raw", async (req, context) => {
    requireSameOrigin(req);
    const user = await requireUser();
    context.userId = user.id;
    const result = await exports.export(
      user,
      requireResourceId(id),
      await readJsonObject(req),
    );
    return new Response(result.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  })(request);
}
