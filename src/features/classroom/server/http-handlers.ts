import { requireUser } from "@/features/auth/server/session-service";
import {
  extractClientIp,
  readJsonObject,
  requireResourceId,
  requireSameOrigin,
  withApi,
} from "@/shared/server/http";
import { logBusinessEvent } from "@/shared/server/logger";
import { AuditService } from "@/features/audit/server/audit-service";
import { PostgresClassroomRepository } from "./classroom-repository";
import { ClassroomService } from "./classroom-service";

const classrooms = new ClassroomService(
  new PostgresClassroomRepository(),
  new AuditService(),
);

export const listClassroomsResponse = withApi(
  "/api/classrooms",
  async (_request, context) => {
    const user = await requireUser();
    context.userId = user.id;
    const list = await classrooms.list(user);
    return Response.json({ classrooms: list });
  },
);

export const createClassroomResponse = withApi(
  "/api/classrooms",
  async (request, context) => {
    const start = performance.now();
    requireSameOrigin(request);
    const user = await requireUser();
    context.userId = user.id;
    const body = await readJsonObject(request);

    const classroom = await classrooms.create(user, {
      name: String(body.name || ""),
      slug: body.slug ? String(body.slug) : undefined,
      timezone: body.timezone ? String(body.timezone) : undefined,
      allowed_email_domains: Array.isArray(body.allowed_email_domains)
        ? body.allowed_email_domains.map(String)
        : undefined,
    });

    logBusinessEvent(
      "classroom_created",
      context,
      performance.now() - start,
      classroom.id,
    );

    return Response.json({ classroom }, { status: 201 });
  },
);

export function classroomDetailResponse(request: Request, id: string) {
  return withApi("/api/classrooms/:id", async (_request, context) => {
    const user = await requireUser();
    context.userId = user.id;
    const classroom = await classrooms.get(user, requireResourceId(id));
    return Response.json({ classroom });
  })(request);
}

export function importRosterResponse(request: Request, id: string) {
  return withApi(
    "/api/classrooms/:id/roster/import",
    async (request, context) => {
      const start = performance.now();
      requireSameOrigin(request);
      const user = await requireUser();
      context.userId = user.id;
      const resourceId = requireResourceId(id);
      const body = await readJsonObject(request);

      const csvText = String(body.csv || "");
      const result = await classrooms.importRoster(user, resourceId, csvText);

      logBusinessEvent(
        "roster_imported",
        context,
        performance.now() - start,
        resourceId,
      );

      return Response.json(result);
    },
  )(request);
}

export function manageMembersResponse(request: Request, id: string) {
  return withApi("/api/classrooms/:id/members", async (request, context) => {
    const start = performance.now();
    requireSameOrigin(request);
    const user = await requireUser();
    context.userId = user.id;
    const resourceId = requireResourceId(id);
    const ipAddress = extractClientIp(request);

    if (request.method === "DELETE") {
      const body = await readJsonObject(request);
      const memberId = String(body.memberId || "");
      const classroom = await classrooms.removeMember(
        user,
        resourceId,
        memberId,
        ipAddress,
      );
      logBusinessEvent(
        "member_removed",
        context,
        performance.now() - start,
        resourceId,
      );
      return Response.json({ classroom });
    }

    const body = await readJsonObject(request);
    const email = String(body.email || "");
    const name = String(body.name || "");
    const role = (body.role as "CO_TEACHER" | "TA") || "TA";

    const classroom = await classrooms.addStaff(
      user,
      resourceId,
      {
        email,
        name,
        role,
      },
      ipAddress,
    );

    logBusinessEvent(
      "member_added",
      context,
      performance.now() - start,
      resourceId,
    );

    return Response.json({ classroom });
  })(request);
}

export function archiveClassroomResponse(request: Request, id: string) {
  return withApi("/api/classrooms/:id/archive", async (request, context) => {
    const start = performance.now();
    requireSameOrigin(request);
    const user = await requireUser();
    context.userId = user.id;
    const resourceId = requireResourceId(id);

    const classroom = await classrooms.archive(user, resourceId);

    logBusinessEvent(
      "classroom_archived",
      context,
      performance.now() - start,
      resourceId,
    );

    return Response.json({ classroom });
  })(request);
}

export const joinClassroomResponse = withApi(
  "/api/classrooms/join",
  async (request, context) => {
    const start = performance.now();
    requireSameOrigin(request);
    const user = await requireUser();
    context.userId = user.id;
    const body = await readJsonObject(request);
    const code = String(body.code || "");

    const classroom = await classrooms.join(user, code);

    logBusinessEvent(
      "classroom_joined",
      context,
      performance.now() - start,
      classroom.id,
    );

    return Response.json({ classroom });
  },
);

export function linkAssignmentResponse(request: Request, id: string) {
  return withApi(
    "/api/classrooms/:id/assignments",
    async (request, context) => {
      const start = performance.now();
      requireSameOrigin(request);
      const user = await requireUser();
      context.userId = user.id;
      const resourceId = requireResourceId(id);
      const body = await readJsonObject(request);
      const assignmentId = String(body.assignmentId || "");

      const classroom = await classrooms.linkAssignment(
        user,
        resourceId,
        assignmentId,
      );

      logBusinessEvent(
        "classroom_assignment_linked",
        context,
        performance.now() - start,
        resourceId,
      );

      return Response.json({ classroom });
    },
  )(request);
}
