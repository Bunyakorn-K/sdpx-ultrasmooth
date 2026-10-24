import { readNotificationResponse } from "@/features/notifications/server/http-handlers";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return readNotificationResponse(request, (await context.params).id);
}
