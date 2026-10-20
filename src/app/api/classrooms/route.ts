import {
  listClassroomsResponse,
  createClassroomResponse,
} from "@/features/classroom/server/http-handlers";

export const GET = listClassroomsResponse;
export const POST = createClassroomResponse;
