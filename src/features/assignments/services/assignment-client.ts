import type { User } from "@/features/auth/types";
import { requestJson } from "@/shared/services/http-client";
import { applyAssignmentCommand } from "../domain/assignment-policy";
import { createAssignment, cloneAssignment } from "../domain/create-assignment";
import type { Assignment } from "../types";
import { loadDemoClassrooms } from "@/features/classroom/data/demo-classrooms";
import { applyClassroomRoster } from "../domain/classroom-roster";

export function demoClassroomRoster(assignment: Assignment): Assignment {
  const classroom = loadDemoClassrooms().find(
    (c) =>
      c.id === assignment.classroomId ||
      c.assignment_ids?.includes(assignment.id),
  );
  return classroom ? applyClassroomRoster(assignment, classroom) : assignment;
}
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
  resolveAppeal: { suffix: "appeals", method: "PUT" },
  group: { suffix: "groups", method: "POST" },
  joinGroup: { suffix: "groups/join", method: "POST" },
  questions: { suffix: "questions", method: "PUT" },
  start: { suffix: "voting/start", method: "POST" },
  stop: { suffix: "voting/stop", method: "POST" },
  finalize: { suffix: "finalize", method: "POST" },
  vote: { suffix: "votes", method: "POST" },
  unpublishPairs: { suffix: "pairs/unpublish", method: "POST" },
  configurePairs: { suffix: "pairs/configure", method: "POST" },
  regeneratePairs: { suffix: "pairs/regenerate", method: "POST" },
  submitPair: { suffix: "pairs/submit", method: "POST" },
  saveEvaluationDrafts: { suffix: "pairs/drafts", method: "PUT" },
  submitEvaluation: { suffix: "submissions", method: "POST" },
  reopen: { suffix: "reopen", method: "POST" },
  overrideScore: { suffix: "scores/override", method: "POST" },
  recomputeScores: { suffix: "recompute", method: "POST" },
  clone: { suffix: "clone", method: "POST" },
  updateDeadline: { suffix: "deadline", method: "POST" },
};
export async function sendAssignmentCommand(input: Record<string, unknown>) {
  const { action, id, ...payload } = input;
  const command = String(action);
  let path: string;
  let method: "POST" | "PUT" = "POST";
  if (command === "create") path = "/api/assignments";
  else if (command === "submitAppeal") path = "/api/appeals";
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
      body: JSON.stringify(
        command === "submitAppeal" ? { ...payload, id } : payload,
      ),
    })
  ).assignment;
}
export function executeDemoCommand(
  user: User,
  assignments: Assignment[],
  input: Record<string, unknown>,
) {
  if (input.action === "create") {
    return demoClassroomRoster(createAssignment(input, user));
  }
  if (input.action === "clone") {
    const original = assignments.find((item) => item.id === input.id);
    if (!original) throw new Error("ไม่พบ assignment ต้นฉบับ");
    return demoClassroomRoster(cloneAssignment(original, user, input));
  }
  const original = assignments.find((item) => item.id === input.id);
  if (!original) throw new Error("ไม่พบ assignment");
  return applyAssignmentCommand(
    demoClassroomRoster(structuredClone(original)),
    user,
    String(input.action),
    input,
  );
}
