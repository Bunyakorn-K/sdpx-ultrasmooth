import { requireUser } from "@/features/auth/server/session-service";
import { AppError } from "@/shared/domain/app-error";
import {
  extractClientIp,
  readJsonObject,
  requireResourceId,
  requireSameOrigin,
  withApi,
} from "@/shared/server/http";
import { logBusinessEvent } from "@/shared/server/logger";
import { PostgresClassroomRepository } from "@/features/classroom/server/classroom-repository";
import { AuditService } from "@/features/audit/server/audit-service";
import { PostgresAssignmentRepository } from "./assignment-repository";
import { AssignmentService } from "./assignment-service";

const auditService = new AuditService();
const assignments = new AssignmentService(
  new PostgresAssignmentRepository(),
  new PostgresClassroomRepository(),
  auditService,
);
const commands = new Set([
  "submitAppeal",
  "resolveAppeal",
  "create",
  "group",
  "joinGroup",
  "questions",
  "start",
  "stop",
  "vote",
  "finalize",
  "unpublishPairs",
  "configurePairs",
  "regeneratePairs",
  "submitPair",
  "saveEvaluationDrafts",
  "submitEvaluation",
  "reopen",
  "overrideScore",
  "recomputeScores",
  "clone",
  "updateDeadline",

  "assignAdditional",
]);
const events: Record<string, string> = {
  submitAppeal: "appeal_submitted",
  resolveAppeal: "appeal_resolved",
  create: "assignment_created",
  clone: "assignment_cloned",
  updateDeadline: "deadline_updated",
  group: "group_created",
  joinGroup: "group_joined",
  questions: "questions_updated",
  start: "voting_started",
  stop: "voting_stopped",
  vote: "vote_submitted",
  finalize: "assignment_finalized",
  unpublishPairs: "pairs_unpublished",
  configurePairs: "pairs_configured",
  regeneratePairs: "pairs_regenerated",
  submitPair: "pair_submitted",
  saveEvaluationDrafts: "evaluation_drafts_saved",
  submitEvaluation: "evaluation_submitted",
  reopen: "assignment_reopened",
  overrideScore: "score_overridden",
  recomputeScores: "interim_scores_recomputed",
  assignAdditional: "additional_pairs_assigned",
};
export const listAssignmentsResponse = withApi(
  "/api/assignments",
  async (_request, context) => {
    const user = await requireUser();
    context.userId = user.id;
    return Response.json({ assignments: await assignments.list(user) });
  },
);
export function assignmentCommandResponse(
  request: Request,
  command?: string,
  resourceId?: string,
  route = "/api/assignments",
) {
  return withApi(route, async (request, context) => {
    const start = performance.now();
    requireSameOrigin(request);
    const user = await requireUser();
    context.userId = user.id;
    const input = await readJsonObject(request);
    const action = command || String(input.action || "create");
    if (!commands.has(action)) throw new AppError("คำขอไม่ถูกต้อง");
    const id = resourceId || String(input.id || "");
    if (action !== "create") requireResourceId(id);
    const ipAddress = extractClientIp(request);
    const assignment = await assignments.execute(user, {
      ...input,
      action,
      id,
      ipAddress,
    });
    logBusinessEvent(
      events[action],
      context,
      performance.now() - start,
      assignment.id,
    );
    return Response.json(
      { assignment },
      {
        status: ["create", "group", "vote", "clone"].includes(action)
          ? 201
          : 200,
      },
    );
  })(request);
}
export async function assignmentDetailResponse(request: Request, id: string) {
  return withApi("/api/assignments/:id", async (_request, context) => {
    const user = await requireUser();
    context.userId = user.id;
    return Response.json({
      assignment: await assignments.get(user, requireResourceId(id)),
    });
  })(request);
}
export async function pairPreviewResponse(request: Request, id: string) {
  return withApi(
    "/api/assignments/:id/pairs/preview",
    async (request, context) => {
      requireSameOrigin(request);
      const user = await requireUser();
      context.userId = user.id;
      const input = await readJsonObject(request);
      return Response.json({
        preview: await assignments.previewPairs(
          user,
          requireResourceId(id),
          input.scope as import("../types").PairScope,
        ),
      });
    },
  )(request);
}

export async function assignmentAuditResponse(request: Request, id: string) {
  return withApi("/api/assignments/:id/audit", async (_request, context) => {
    const user = await requireUser();
    context.userId = user.id;
    const assignment = await assignments.get(user, requireResourceId(id));
    if (user.role !== "teacher" || assignment.ownerId !== user.id) {
      throw new AppError("เฉพาะอาจารย์เจ้าของงานเท่านั้นที่สามารถดู Audit Log ได้", 403);
    }
    const auditService = new AuditService();
    const logs = await auditService.listByAssignment(id);
    return Response.json({ logs });
  })(request);
}

export async function assignmentEvaluatorsResponse(
  request: Request,
  id: string,
) {
  return withApi(
    "/api/assignments/:id/evaluators",
    async (_request, context) => {
      const user = await requireUser();
      context.userId = user.id;
      const assignment = await assignments.get(user, requireResourceId(id));
      if (user.role !== "teacher" || assignment.ownerId !== user.id) {
        throw new AppError(
          "เฉพาะอาจารย์เจ้าของงานเท่านั้นที่สามารถดูตัวตนผู้ประเมินได้",
          403,
        );
      }
      const ipAddress = extractClientIp(_request);
      await auditService.record({
        actor_id: user.id,
        action: "VIEW_EVALUATOR_IDENTITY",
        resource_type: "assignment_evaluators",
        resource_id: assignment.id,
        assignment_id: assignment.id,
        classroom_id: assignment.classroomId || null,
        ip_address: ipAddress,
        reason: "Owner accessed real evaluator identities",
      });
      return Response.json({
        evaluators: assignment.students,
        pairs: assignment.pairs ?? [],
        submissions: assignment.evaluationSubmissions ?? [],
      });
    },
  )(request);
}
