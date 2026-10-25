import { randomInt } from "node:crypto";
import { requireUser } from "@/features/auth/server/session-service";
import { AppError } from "@/shared/domain/app-error";
import {
  readJsonObject,
  requireResourceId,
  requireSameOrigin,
  withApi,
} from "@/shared/server/http";
import { logBusinessEvent } from "@/shared/server/logger";
import { PostgresClassroomRepository } from "@/features/classroom/server/classroom-repository";
import { PostgresAssignmentRepository } from "./assignment-repository";
import { AssignmentService } from "./assignment-service";
const assignments = new AssignmentService(
  new PostgresAssignmentRepository(),
  () => String(randomInt(100000, 1000000)),
  new PostgresClassroomRepository(),
);
const commands = new Set([
  "create",
  "join",
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
  "reopen",
]);
const events: Record<string, string> = {
  create: "assignment_created",
  join: "assignment_joined",
  group: "group_created",
  joinGroup: "group_joined",
  questions: "questions_updated",
  start: "voting_started",
  stop: "voting_stopped",
  vote: "vote_submitted",
  finalize: "assignment_finalized",
  unpublishPairs: "assignment_unpublished",
  configurePairs: "pair_configuration_updated",
  regeneratePairs: "pairs_regenerated",
  submitPair: "comparison_submitted",
  reopen: "assignment_reopened",
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
    if (!["create", "join"].includes(action)) requireResourceId(id);
    if (action === "join" && !/^\d{6}$/.test(String(input.code || "")))
      throw new AppError("รหัสเข้าร่วมต้องเป็นตัวเลข 6 หลัก");
    const assignment = await assignments.execute(user, {
      ...input,
      action,
      id,
    });
    logBusinessEvent(
      events[action],
      context,
      performance.now() - start,
      assignment.id,
    );
    return Response.json(
      { assignment },
      { status: ["create", "group", "vote"].includes(action) ? 201 : 200 },
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
