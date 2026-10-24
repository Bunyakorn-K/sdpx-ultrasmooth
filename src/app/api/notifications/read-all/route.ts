import { readNotificationResponse } from "@/features/notifications/server/http-handlers";

export async function POST(request: Request) {
  return readNotificationResponse(request);
}
