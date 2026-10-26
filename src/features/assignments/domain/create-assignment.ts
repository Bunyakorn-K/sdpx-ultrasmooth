import type { User } from "@/features/auth/types";
import { AppError } from "@/shared/domain/app-error";
import type { Assignment } from "../types";

export function validateArtifactUrl(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new AppError("ลิงก์ผลงานไม่ถูกต้อง", 400);
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 2000)
    throw new AppError("ลิงก์ผลงานต้องมีความยาวไม่เกิน 2,000 ตัวอักษร", 400);
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new AppError("ลิงก์ผลงานต้องเป็น URL ที่ถูกต้อง (เช่น https://...)", 400);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError("ลิงก์ผลงานต้องเริ่มต้นด้วย http:// หรือ https://", 400);
  }
  return trimmed;
}

export function validateQuestions(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    value.some(
      (question) =>
        typeof question !== "string" ||
        !question.trim() ||
        question.length > 1000,
    )
  )
    throw new AppError("คำถามไม่ถูกต้อง (สูงสุด 100 ข้อ)");
  return value.map((question) => question.trim());
}
export function createAssignment(
  input: Record<string, unknown>,
  user: User,
): Assignment {
  if (user.role !== "teacher") throw new AppError("เฉพาะครูเท่านั้น", 403);
  const title = String(input.title || "").trim();
  const deadline = new Date(String(input.deadline));
  const evaluationMode = input.evaluationMode ?? "group";
  if (evaluationMode !== "group" && evaluationMode !== "individual")
    throw new AppError("รูปแบบการประเมินไม่ถูกต้อง");
  if (
    !title ||
    title.length > 200 ||
    !Number.isFinite(deadline.getTime()) ||
    deadline.getTime() <= Date.now()
  )
    throw new AppError("กรุณากรอกชื่องานไม่เกิน 200 ตัวอักษรและวันสิ้นสุดในอนาคต");
  const groupMaxScore =
    input.groupMaxScore !== undefined && input.groupMaxScore !== ""
      ? Number(input.groupMaxScore)
      : 15;
  const individualMaxScore =
    input.individualMaxScore !== undefined && input.individualMaxScore !== ""
      ? Number(input.individualMaxScore)
      : 5;
  const scoreFloor =
    input.scoreFloor !== undefined && input.scoreFloor !== ""
      ? Number(input.scoreFloor)
      : 0.6;
  const scoreCeiling =
    input.scoreCeiling !== undefined && input.scoreCeiling !== ""
      ? Number(input.scoreCeiling)
      : 1.0;
  const targetCoverage = input.targetCoverage
    ? Number(input.targetCoverage)
    : 5;
  const minComparisons = input.minComparisons
    ? Number(input.minComparisons)
    : 3;
  const completionThreshold =
    input.completionThreshold !== undefined && input.completionThreshold !== ""
      ? Number(input.completionThreshold)
      : 0.9;
  const instructorWeight =
    input.instructorWeight !== undefined && input.instructorWeight !== ""
      ? Number(input.instructorWeight)
      : 1.0;

  const classroomId = input.classroomId
    ? String(input.classroomId).trim()
    : input.classroom_id
      ? String(input.classroom_id).trim()
      : undefined;

  const rawArtifactUrl = input.artifactUrl ?? input.artifact_url;
  const artifactUrl = validateArtifactUrl(rawArtifactUrl);

  const groupDeadline = input.groupDeadline
    ? new Date(String(input.groupDeadline)).toISOString()
    : deadline.toISOString();
  const individualDeadline = input.individualDeadline
    ? new Date(String(input.individualDeadline)).toISOString()
    : deadline.toISOString();

  return {
    id: crypto.randomUUID(),
    ownerId: user.id,
    classroomId,
    title,
    description: String(input.description || "").slice(0, 2000),
    subject: String(input.subject || "ทั่วไป").slice(0, 100),
    deadline: deadline.toISOString(),
    groupDeadline,
    individualDeadline,
    artifactUrl,
    status: "draft",
    pairwiseRequired: true,
    evaluationMode,
    questions: validateQuestions(input.questions || []),
    groups: [],
    students: [],
    votes: [],
    createdAt: new Date().toISOString(),
    color: "mint",
    groupMaxScore,
    individualMaxScore,
    scoreFloor,
    scoreCeiling,
    targetCoverage,
    minComparisons,
    completionThreshold,
    instructorWeight,
  };
}

export function cloneAssignment(
  source: Assignment,
  user: User,
  overrides: Record<string, unknown> = {},
): Assignment {
  if (user.role !== "teacher") throw new AppError("เฉพาะครูเท่านั้น", 403);
  const now = Date.now();
  // Default deadline for cloned assignment is 7 days in the future to ensure it starts valid in draft
  const defaultDeadline = new Date(now + 7 * 86400000).toISOString();
  const deadline = overrides.deadline
    ? new Date(String(overrides.deadline)).toISOString()
    : defaultDeadline;

  return {
    id: crypto.randomUUID(),
    ownerId: user.id,
    classroomId:
      (overrides.classroomId as string | undefined) ?? source.classroomId,
    title: String(overrides.title || `${source.title} (สำเนา)`).slice(0, 200),
    description: String(overrides.description ?? source.description).slice(
      0,
      2000,
    ),
    subject: String(overrides.subject ?? source.subject).slice(0, 100),
    deadline,
    groupDeadline: overrides.groupDeadline
      ? new Date(String(overrides.groupDeadline)).toISOString()
      : deadline,
    individualDeadline: overrides.individualDeadline
      ? new Date(String(overrides.individualDeadline)).toISOString()
      : deadline,
    artifactUrl: validateArtifactUrl(
      (overrides.artifactUrl as string | undefined) ?? source.artifactUrl,
    ),
    status: "draft",
    pairwiseRequired: true,
    evaluationMode: source.evaluationMode ?? "group",
    questions: [...source.questions],
    criteriaWeights: source.criteriaWeights
      ? { ...source.criteriaWeights }
      : undefined,
    groups: [],
    students: [],
    votes: [],
    createdAt: new Date().toISOString(),
    color: source.color || "mint",
    groupMaxScore: source.groupMaxScore ?? 15,
    individualMaxScore: source.individualMaxScore ?? 5,
    scoreFloor: source.scoreFloor ?? 0.6,
    scoreCeiling: source.scoreCeiling ?? 1.0,
    targetCoverage: source.targetCoverage ?? 5,
    minComparisons: source.minComparisons ?? 3,
    completionThreshold: source.completionThreshold ?? 0.9,
    instructorWeight: source.instructorWeight ?? 1.0,
    maxWorkload: source.maxWorkload ?? 8,
  };
}
