import {
  authResponse,
  sessionResponse,
} from "@/features/auth/server/http-handlers";

export const GET = sessionResponse;
export const POST = authResponse();
