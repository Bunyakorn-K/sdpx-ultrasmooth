import type { User } from "@/features/auth/types";
import { requestJson } from "@/shared/services/http-client";
import { applyAssignmentCommand } from "../domain/assignment-policy";
import { createAssignment } from "../domain/create-assignment";
import type { Assignment } from "../types";
export async function listAssignments() {
  const response = await requestJson<{ assignments: Assignment[] }>(
    "/api/assignments",
  );
  return response.assignments;
}
const commandEndpoints: Record<
  string,
  { suffix: string; method: "POST" | "PUT" }
> = {
  group: { suffix: "groups", method: "POST" },
  joinGroup: { suffix: "groups/join", method: "POST" },
  questions: { suffix: "questions", method: "PUT" },
  start: { suffix: "voting/start", method: "POST" },
  stop: { suffix: "voting/stop", method: "POST" },
  vote: { suffix: "votes", method: "POST" },
};
export async function sendAssignmentCommand(input: Record<string, unknown>) {
  const { action, id, ...payload } = input;
  const command = String(action);
  let path: string;
  let method: "POST" | "PUT" = "POST";
  if (command === "create") path = "/api/assignments";
  else if (command === "join") path = "/api/assignments/join";
  else {
    const endpoint = Object.hasOwn(commandEndpoints, command)
      ? commandEndpoints[command]
      : undefined;
    if (!endpoint || typeof id !== "string") throw new Error("คำขอไม่ถูกต้อง");
    path = `/api/assignments/${encodeURIComponent(id)}/${endpoint.suffix}`;
    method = endpoint.method;
  }
  return (
    await requestJson<{ assignment: Assignment }>(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  ).assignment;
}
export function executeDemoCommand(
  user: User,
  assignments: Assignment[],
  input: Record<string, unknown>,
) {
  if (input.action === "create") {
    let code: string;
    do {
      code = String(Math.floor(100000 + Math.random() * 900000));
    } while (assignments.some((item) => item.code === code));
    return createAssignment(input, user, code);
  }
  const original =
    input.action === "join"
      ? assignments.find((item) => item.code === input.code)
      : assignments.find((item) => item.id === input.id);
  if (!original) throw new Error("ไม่พบ assignment");
  return applyAssignmentCommand(
    structuredClone(original),
    user,
    String(input.action),
    input,
  );
}
