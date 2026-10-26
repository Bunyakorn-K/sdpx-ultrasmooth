import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import { AppError } from "@/shared/domain/app-error";
import type { PairAssignment } from "../types";

function samePair(a: PairAssignment, b: PairAssignment) {
  return (
    a.side === b.side &&
    a.criterion_id === b.criterion_id &&
    [a.item_a_id, a.item_b_id].sort().join(":") ===
      [b.item_a_id, b.item_b_id].sort().join(":")
  );
}

export function additionalCandidates(a: Assignment, pair: PairAssignment) {
  const existing = a.pairs?.filter((p) => samePair(p, pair)) ?? [];
  const assigned = new Set(existing.map((p) => p.evaluator_user_id));
  const studentIds = new Set(a.students.map((s) => s.id));
  return a.groups.flatMap((g) =>
    g.members.filter((m) => {
      if (!studentIds.has(m.id) || assigned.has(m.id)) return false;
      if (
        pair.side === "GROUP" &&
        (g.id === pair.item_a_id || g.id === pair.item_b_id)
      )
        return false;
      if (
        pair.side === "INDIVIDUAL" &&
        (m.id === pair.item_a_id ||
          m.id === pair.item_b_id ||
          !g.members.some((x) => x.id === pair.item_a_id) ||
          !g.members.some((x) => x.id === pair.item_b_id))
      )
        return false;
      const workload =
        a.pairs?.filter(
          (p) =>
            p.evaluator_user_id === m.id &&
            p.criterion_id === pair.criterion_id &&
            p.side === pair.side,
        ).length ?? 0;
      return workload < (a.maxWorkload ?? 8);
    }),
  );
}

export function assignAdditionalEvaluations(
  a: Assignment,
  user: User,
  input: Record<string, unknown>,
  random = Math.random,
) {
  if (user.role !== "teacher" || a.ownerId !== user.id)
    throw new AppError("เฉพาะครูเจ้าของงานเท่านั้น", 403);
  if (
    a.status !== "active" ||
    a.pairingPaused ||
    !Number.isFinite(Date.parse(a.deadline)) ||
    Date.parse(a.deadline) <= Date.now()
  )
    throw new AppError(
      "ส่งประเมินเพิ่มได้ขณะเปิดประเมินและยังไม่หมดเวลาเท่านั้น",
      409,
    );
  if (input.expectedGeneration !== a.pairGeneration)
    throw new AppError("ชุดคู่เปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด", 409);
  const pair = a.pairs?.find((p) => p.id === input.pairId);
  if (!pair) throw new AppError("ไม่พบคู่ประเมิน", 404);
  const existing = a.pairs!.filter((p) => samePair(p, pair));
  if (input.expectedAssignedCount !== existing.length)
    throw new AppError("จำนวนผู้ประเมินเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด", 409);
  if (
    typeof input.count !== "number" ||
    !Number.isInteger(input.count) ||
    input.count < 1 ||
    input.count > 100
  )
    throw new AppError("กรุณาระบุจำนวนผู้ประเมินเพิ่มตั้งแต่ 1–100 คน");
  const candidates = additionalCandidates(a, pair);
  if (input.count > candidates.length)
    throw new AppError(
      `มีนักศึกษาที่มีสิทธิ์และ workload เพียงพอเหลือ ${candidates.length} คน`,
      409,
    );
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const added = candidates.slice(0, input.count).map((m) => ({
    ...pair,
    id: crypto.randomUUID(),
    evaluator_user_id: m.id,
    display_left_item_id: random() < 0.5 ? pair.item_a_id : pair.item_b_id,
    generation: a.pairGeneration!,
    source: "INSTRUCTOR_EXTRA" as const,
    created_at: new Date().toISOString(),
  }));
  a.pairs!.push(...added);
  return added;
}
