import type { Assignment } from "../types";
import type { User } from "@/features/auth/types";
import { AppError } from "@/shared/domain/app-error";

export const APPEAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export function appealFinalizedAt(a: Assignment) {
  return a.finalizedSnapshot?.finalizedAt ?? a.finalizedAt;
}
export function appealMaximum(a: Assignment) {
  return (a.groupMaxScore ?? 15) + (a.individualMaxScore ?? (a.pairs ? 5 : 0));
}
function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 2000)
    throw new AppError(`${label}ต้องมีความยาว 1–2000 ตัวอักษร`);
  return value.trim();
}
function currentCycle(a: Assignment, input: Record<string, unknown>) {
  const finalizedAt = appealFinalizedAt(a);
  if (a.status !== "finalized" || !finalizedAt)
    throw new AppError("ยื่นและพิจารณาอุทธรณ์ได้หลัง Finalize เท่านั้น", 409);
  if (input.expectedFinalizedAt !== finalizedAt)
    throw new AppError("ผลคะแนนเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด", 409);
  return finalizedAt;
}
export function submitAppeal(
  a: Assignment,
  user: User,
  input: Record<string, unknown>,
  now = Date.now(),
) {
  if (user.role !== "student" || !a.students.some((s) => s.id === user.id))
    throw new AppError("เฉพาะนักศึกษาใน Assignment นี้เท่านั้น", 403);
  const finalizedAt = currentCycle(a, input);
  const start = Date.parse(finalizedAt);
  if (!Number.isFinite(start) || now < start || now > start + APPEAL_WINDOW_MS)
    throw new AppError("หมดเวลายื่นอุทธรณ์ (ภายใน 7 วันหลัง Finalize)", 409);
  const message = text(input.message, "เหตุผลการอุทธรณ์");
  if (
    a.appeals?.some(
      (r) =>
        r.studentId === user.id &&
        r.finalizedAt === finalizedAt &&
        r.generation === (a.pairGeneration ?? 0),
    )
  )
    throw new AppError("คุณยื่นอุทธรณ์สำหรับผลคะแนนรอบนี้แล้ว", 409);
  (a.appeals ??= []).push({
    id: crypto.randomUUID(),
    studentId: user.id,
    message,
    finalizedAt,
    generation: a.pairGeneration ?? 0,
    submittedAt: new Date(now).toISOString(),
  });
}
export function resolveAppeal(
  a: Assignment,
  user: User,
  input: Record<string, unknown>,
  now = Date.now(),
) {
  if (user.role !== "teacher" || a.ownerId !== user.id)
    throw new AppError("เฉพาะอาจารย์เจ้าของ Assignment เท่านั้น", 403);
  const finalizedAt = currentCycle(a, input);
  const appeal = a.appeals?.find((r) => r.id === input.appealId);
  if (!appeal) throw new AppError("ไม่พบคำร้องอุทธรณ์", 404);
  if (
    appeal.finalizedAt !== finalizedAt ||
    appeal.generation !== (a.pairGeneration ?? 0)
  )
    throw new AppError(
      "คำร้องนี้เป็นผลคะแนนรอบเก่า ไม่สามารถเปลี่ยนคะแนนรอบปัจจุบัน",
      409,
    );
  if (appeal.decision) throw new AppError("คำร้องนี้พิจารณาแล้ว", 409);
  const response = text(input.response, "คำตอบของอาจารย์");
  if (input.outcome !== "uphold" && input.outcome !== "override")
    throw new AppError("กรุณาเลือกผลการพิจารณา");
  const score = input.outcome === "override" ? input.score : undefined;
  if (
    input.outcome === "override" &&
    (typeof score !== "number" ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > appealMaximum(a))
  )
    throw new AppError(`คะแนนรวมต้องอยู่ระหว่าง 0–${appealMaximum(a)}`);
  appeal.decision = {
    outcome: input.outcome,
    response,
    score: score as number | undefined,
    decidedBy: user.id,
    decidedAt: new Date(now).toISOString(),
  };
}
/** An appeal changes only this student's final total, leaving raw ballots/snapshot intact. */
export function appealScore(
  a: Assignment,
  studentId: string,
  calculated: number | null,
) {
  const finalizedAt = appealFinalizedAt(a);
  const decision = a.appeals?.find(
    (r) =>
      r.studentId === studentId &&
      r.finalizedAt === finalizedAt &&
      r.generation === (a.pairGeneration ?? 0) &&
      r.decision?.outcome === "override",
  )?.decision;
  return a.status === "finalized" && decision ? decision.score! : calculated;
}
