import type { User } from "@/features/auth/types";
import { AppError } from "@/shared/domain/app-error";
import type { Assignment } from "../types";
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
    throw new AppError(
      "กรุณากรอกชื่องานไม่เกิน 200 ตัวอักษรและวันสิ้นสุดในอนาคต",
    );
  const groupMaxScore = input.groupMaxScore ? Number(input.groupMaxScore) : 15;
  const individualMaxScore = input.individualMaxScore
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

  return {
    id: crypto.randomUUID(),
    ownerId: user.id,
    classroomId,
    title,
    description: String(input.description || "").slice(0, 2000),
    subject: String(input.subject || "ทั่วไป").slice(0, 100),
    deadline: deadline.toISOString(),
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
