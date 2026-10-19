export class GroupRuleError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function requireOpenEnrollment(assignment: { status: string; deadlineUtc: Date | null }, now = new Date()) {
  if (assignment.status !== "DRAFT") throw new GroupRuleError(409, "Group enrollment closes when voting starts.");
  if (assignment.deadlineUtc && assignment.deadlineUtc <= now) throw new GroupRuleError(409, "The assignment deadline has passed.");
}

export function parseGroupInput(body: unknown) {
  if (!body || typeof body !== "object") throw new GroupRuleError(400, "Group details are required.");
  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const artifactUrl = typeof input.artifactUrl === "string" ? input.artifactUrl.trim() : "";
  if (!name || name.length > 100 || description.length > 4000 || artifactUrl.length > 2000) {
    throw new GroupRuleError(400, "Use a group name of 1–100 characters and a description under 4001 characters.");
  }
  if (artifactUrl) {
    try {
      const url = new URL(artifactUrl);
      if (url.protocol !== "https:") throw new Error();
    } catch { throw new GroupRuleError(400, "Submission links must use HTTPS."); }
  }
  return { name, description: description || null, artifactUrl: artifactUrl || null };
}
