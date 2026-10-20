import type { PairAssignment } from "../types";

export type GroupInfo = {
  id: string;
  name: string;
  size: number;
};

export type StudentInfo = {
  id: string;
  groupId: string;
};

export type FeasibilityResult = {
  feasibleR: number;
  workloadK: number;
  totalPairs: number;
  slotsNeeded: number;
  originalR: number;
  wasReduced: boolean;
  message?: string;
};

export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    // Mulberry32 algorithm
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  coinFlip(): boolean {
    return this.next() >= 0.5;
  }

  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

export function solveFeasibility(
  totalStudents: number,
  groups: GroupInfo[],
  targetCoverage: number = 5,
  maxWorkload: number = 8,
): FeasibilityResult {
  const N = groups.length;
  const S = totalStudents;

  if (N < 2 || S < 2) {
    return {
      feasibleR: 0,
      workloadK: 0,
      totalPairs: 0,
      slotsNeeded: 0,
      originalR: targetCoverage,
      wasReduced: true,
      message: "ต้องการอย่างน้อย 2 กลุ่มเพื่อทำการประเมิน",
    };
  }

  const P = (N * (N - 1)) / 2;

  // Maximum people who can evaluate pair (a, b) = S - |a| - |b|
  let minEligibleOverPairs = Infinity;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const eligible = S - groups[i].size - groups[j].size;
      if (eligible < minEligibleOverPairs) {
        minEligibleOverPairs = eligible;
      }
    }
  }

  let R = targetCoverage;

  while (R > 0) {
    const slots = P * R;
    const k = Math.ceil(slots / S);

    const condition1 = k <= P - (N - 1);
    const condition2 = k <= maxWorkload;
    const condition3 = R <= minEligibleOverPairs;

    if (condition1 && condition2 && condition3) {
      const wasReduced = R < targetCoverage;
      return {
        feasibleR: R,
        workloadK: k,
        totalPairs: P,
        slotsNeeded: slots,
        originalR: targetCoverage,
        wasReduced,
        message: wasReduced
          ? `ห้องนี้มี ${N} กลุ่ม แต่ละคู่มีผู้มีสิทธิ์ประเมินสูงสุด ${minEligibleOverPairs} คน จึงตั้ง coverage ได้สูงสุด ${R} ครั้งต่อคู่ (จากเดิม ${targetCoverage}) และภาระงานอยู่ที่ ${k} คู่ต่อเกณฑ์`
          : undefined,
      };
    }
    R--;
  }

  return {
    feasibleR: 1,
    workloadK: 1,
    totalPairs: P,
    slotsNeeded: P,
    originalR: targetCoverage,
    wasReduced: true,
    message: "ไม่สามารถจัดสรรคู่ตามเงื่อนไขความครอบคลุมได้",
  };
}

export function generateGroupPairs(
  assignmentId: string,
  criterionId: string,
  students: StudentInfo[],
  groups: GroupInfo[],
  targetCoverage: number = 5,
  maxWorkload: number = 8,
  seed: number = 42,
): PairAssignment[] {
  const N = groups.length;
  if (N < 2 || students.length === 0) return [];

  const rng = new SeededRng(seed);
  const feasibility = solveFeasibility(
    students.length,
    groups,
    targetCoverage,
    maxWorkload,
  );
  const R = feasibility.feasibleR;
  const k = feasibility.workloadK;

  // Generate all pairs
  const allPairs: { key: string; itemA: string; itemB: string }[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      allPairs.push({
        key: `${groups[i].id}:${groups[j].id}`,
        itemA: groups[i].id,
        itemB: groups[j].id,
      });
    }
  }

  const demand = new Map<string, number>();
  allPairs.forEach((p) => demand.set(p.key, R));

  const result: PairAssignment[] = [];
  const assignedPairsPerStudent = new Map<string, Set<string>>();
  students.forEach((s) => assignedPairsPerStudent.set(s.id, new Set()));

  // Shuffle students for fairness
  const shuffledStudents = rng.shuffle(students);

  for (const student of shuffledStudents) {
    const studentAssigned = assignedPairsPerStudent.get(student.id)!;

    // Filter eligible pairs:
    // 1) Student's group must NOT be in pair (INV-1)
    // 2) Pair must not already be assigned to this student (INV-2)
    const eligible = allPairs.filter((p) => {
      if (p.itemA === student.groupId || p.itemB === student.groupId)
        return false;
      if (studentAssigned.has(p.key)) return false;
      return true;
    });

    // Sort by remaining demand descending, with random tie-breaker
    eligible.sort((a, b) => {
      const dA = demand.get(a.key) || 0;
      const dB = demand.get(b.key) || 0;
      if (dB !== dA) return dB - dA;
      return rng.next() - 0.5;
    });

    const chosen = eligible.slice(0, k);

    for (const pair of chosen) {
      demand.set(pair.key, (demand.get(pair.key) || 0) - 1);
      studentAssigned.add(pair.key);

      const leftIsA = rng.coinFlip();
      result.push({
        id: `pair-${assignmentId}-${criterionId}-${student.id}-${pair.itemA}-${pair.itemB}`,
        assignment_id: assignmentId,
        criterion_id: criterionId,
        side: "GROUP",
        item_a_id: pair.itemA,
        item_b_id: pair.itemB,
        evaluator_user_id: student.id,
        display_left_item_id: leftIsA ? pair.itemA : pair.itemB,
        generation: 1,
        source: "AUTO",
        created_at: new Date().toISOString(),
      });
    }
  }

  return result;
}

export function generateIndividualPairs(
  assignmentId: string,
  criterionId: string,
  groupId: string,
  members: { id: string }[],
  maxWorkload: number = 8,
  seed: number = 42,
): PairAssignment[] {
  const m = members.length;
  // FR-PAIR-12: m <= 2 -> no individual evaluation
  if (m <= 2) return [];

  const rng = new SeededRng(seed);

  // All pairs in group C(m, 2)
  const groupPairs: { key: string; itemA: string; itemB: string }[] = [];
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      groupPairs.push({
        key: `${members[i].id}:${members[j].id}`,
        itemA: members[i].id,
        itemB: members[j].id,
      });
    }
  }

  const result: PairAssignment[] = [];

  for (const member of members) {
    // Evaluator MUST NOT receive pair with themselves (FR-PAIR-03 / INV-1)
    const eligible = groupPairs.filter(
      (p) => p.itemA !== member.id && p.itemB !== member.id,
    );

    // If eligible pairs > maxWorkload, pick maxWorkload pairs (FR-PAIR-14)
    const chosen =
      eligible.length > maxWorkload
        ? rng.shuffle(eligible).slice(0, maxWorkload)
        : eligible;

    for (const pair of chosen) {
      const leftIsA = rng.coinFlip();
      result.push({
        id: `indiv-${assignmentId}-${criterionId}-${member.id}-${pair.itemA}-${pair.itemB}`,
        assignment_id: assignmentId,
        criterion_id: criterionId,
        side: "INDIVIDUAL",
        item_a_id: pair.itemA,
        item_b_id: pair.itemB,
        evaluator_user_id: member.id,
        display_left_item_id: leftIsA ? pair.itemA : pair.itemB,
        generation: 1,
        source: "AUTO",
        created_at: new Date().toISOString(),
      });
    }
  }

  return result;
}
