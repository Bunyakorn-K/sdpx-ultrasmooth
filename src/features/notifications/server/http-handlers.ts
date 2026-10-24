import { requireUser } from "@/features/auth/server/session-service";
import { PostgresAssignmentRepository } from "@/features/assignments/server/assignment-repository";
import { AppError } from "@/shared/domain/app-error";
import {
  requireResourceId,
  requireSameOrigin,
  withApi,
} from "@/shared/server/http";
import {
  PostgresNotificationRepository,
  type NotificationCursor,
} from "../data/notification-repository";
import { NotificationService } from "./notification-service";

const notifications = new NotificationService(
  new PostgresNotificationRepository(),
  new PostgresAssignmentRepository(),
);
export const listNotificationsResponse = withApi(
  "/api/notifications",
  async (request, context) => {
    const user = await requireUser();
    context.userId = user.id;
    const raw = new URL(request.url).searchParams.get("before");
    let cursor: NotificationCursor | undefined;
    if (raw !== null) {
      const [time, id, extra] = raw.split("|");
      if (
        !time ||
        !id ||
        extra !== undefined ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(time) ||
        !Number.isFinite(Date.parse(time))
      )
        throw new AppError("Invalid notification cursor.", 400);
      if (new Date(time).toISOString().slice(0, 19) !== time.slice(0, 19))
        throw new AppError("Invalid notification cursor.", 400);
      cursor = { time, id: requireResourceId(id) };
    }
    return Response.json(await notifications.list(user, cursor));
  },
);
export async function readNotificationResponse(request: Request, id?: string) {
  return withApi("/api/notifications/:id/read", async (incoming, context) => {
    requireSameOrigin(incoming);
    const user = await requireUser();
    context.userId = user.id;
    await notifications.read(
      user,
      id === undefined ? undefined : requireResourceId(id),
    );
    return Response.json({ ok: true });
  })(request);
}
