export type AccountRole = "teacher" | "student";

export function accountRole(subject: string, teacherIds = process.env.TEACHER_AUTH_IDS ?? ""): AccountRole {
  return teacherIds.split(",").map((id) => id.trim()).filter(Boolean).includes(subject)
    ? "teacher" : "student";
}

export function devAuthEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_AUTH === "1";
}
