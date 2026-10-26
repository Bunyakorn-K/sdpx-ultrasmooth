import type { Assignment, PairScope } from "@/features/assignments/types";
import { AppError } from "@/shared/domain/app-error";
import type { Criterion, PairAssignment } from "../types";
import { SeededRng, generateIndividualPairs } from "./pairing-engine";

export function pairingShape(a: Assignment) {
  return JSON.stringify([a.groups, a.questions]);
}

export function generatedCriteria(a: Assignment): Criterion[] {
  const sides = [...new Set(a.pairs?.map((p) => p.side) ?? [])];
  return sides.flatMap((side) =>
    a.questions.map((name, i) => ({
      id: `${side}-${i}`,
      assignment_id: a.id,
      side,
      name,
      description: name,
      weight_pct: 100 / a.questions.length,
      display_order: i + 1,
    })),
  );
}

type Edge = { to: number; rev: number; capacity: number };
// Integral max-flow: each pair receives exactly R distinct eligible evaluators.
// Reverse edges allow reassignment when a greedy placement would strand a pair.
// Enforces INV-4: difference between evaluator workloads <= 1.
function distribute(a: Assignment, coverage: number, seed: number) {
  const rng = new SeededRng(seed);
  const groups = a.groups.filter((g) => g.members.length);
  const students = rng.shuffle(
    groups.flatMap((g) => g.members.map((m) => ({ id: m.id, group: g.id }))),
  );
  const items = groups.flatMap((g, i) =>
    groups.slice(i + 1).map((h) => ({ a: g.id, b: h.id })),
  );
  if (!students.length || !items.length) return null;

  const totalSlots = items.length * coverage;
  const maximum = a.maxWorkload ?? 8;
  const kMin = Math.floor(totalSlots / students.length);
  const kMax = Math.min(maximum, Math.ceil(totalSlots / students.length));
  const numExtra = totalSlots % students.length;

  const sink = 1 + items.length + students.length;
  const graph: Edge[][] = Array.from({ length: sink + 1 }, () => []);
  function edge(from: number, to: number, capacity: number) {
    const forward = { to, rev: graph[to].length, capacity };
    graph[from].push(forward);
    graph[to].push({ to: from, rev: graph[from].length - 1, capacity: 0 });
    return forward;
  }
  const assignments: {
    pair: (typeof items)[number];
    student: string;
    edge: Edge;
  }[] = [];
  items.forEach((pair, i) => {
    edge(0, i + 1, coverage);
    students.forEach((student, j) => {
      if (student.group === pair.a || student.group === pair.b) return;
      assignments.push({
        pair,
        student: student.id,
        edge: edge(i + 1, items.length + j + 1, 1),
      });
    });
  });

  // Stage 1: Enforce INV-4 (workload difference <= 1) by initializing student capacity to kMin / kMin+1
  const studentSinkEdges: Edge[] = [];
  students.forEach((_, j) => {
    const cap = j < numExtra ? kMin + 1 : kMin;
    studentSinkEdges.push(edge(items.length + j + 1, sink, cap));
  });

  function runFlow() {
    let flow = 0;
    while (true) {
      const previous: { node: number; edge: Edge }[] = [];
      const seen = new Set([0]);
      const queue = [0];
      for (let head = 0; head < queue.length && !seen.has(sink); head++) {
        const node = queue[head];
        for (const e of graph[node]) {
          if (!e.capacity || seen.has(e.to)) continue;
          seen.add(e.to);
          previous[e.to] = { node, edge: e };
          queue.push(e.to);
        }
      }
      if (!seen.has(sink)) break;
      for (let node = sink; node !== 0;) {
        const step = previous[node];
        step.edge.capacity--;
        graph[node][step.edge.rev].capacity++;
        node = step.node;
      }
      flow++;
    }
    return flow;
  }

  let totalFlow = runFlow();
  // If strict balanced distribution cannot saturate flow due to group constraints,
  // progressively relax student capacity up to maximum (maxWorkload)
  if (totalFlow < totalSlots && kMax < maximum) {
    for (
      let extra = 1;
      extra <= maximum - kMax && totalFlow < totalSlots;
      extra++
    ) {
      studentSinkEdges.forEach((e) => {
        e.capacity += 1;
      });
      totalFlow += runFlow();
    }
  }

  return totalFlow === totalSlots && items.length > 0
    ? assignments.filter((x) => x.edge.capacity === 0)
    : null;
}

export function previewRegeneration(a: Assignment, scope: PairScope) {
  if (!["group", "individual", "both"].includes(scope))
    throw new AppError("ขอบเขตการสร้างคู่ไม่ถูกต้อง");
  if (a.status !== "draft")
    throw new AppError("ต้องนำงานกลับเป็น Draft ก่อนสร้างคู่ใหม่", 409);
  if (!a.questions.length || a.questions.length > 100)
    throw new AppError("กรุณากำหนดเกณฑ์การประเมินก่อน");
  if (new Date(a.deadline).getTime() <= Date.now())
    throw new AppError("กรุณาขยายกำหนดส่งให้เป็นเวลาในอนาคต");
  const ids = a.groups.flatMap((g) => g.members.map((m) => m.id));
  if (new Set(ids).size !== ids.length)
    throw new AppError("นักศึกษาต้องอยู่ได้เพียงกลุ่มเดียว");
  if (a.pairs && a.pairingShape !== pairingShape(a) && scope !== "both")
    throw new AppError("สมาชิกหรือเกณฑ์เปลี่ยนแล้ว ต้องสร้างใหม่ทั้งสองส่วน");
  const generation = (a.pairGeneration ?? 0) + 1;
  const target = a.targetCoverage ?? 5;
  const maximum = a.maxWorkload ?? 8;
  if (
    !Number.isInteger(target) ||
    target < 1 ||
    target > 50 ||
    !Number.isInteger(maximum) ||
    maximum < 1 ||
    maximum > 100
  )
    throw new AppError(
      "Coverage ต้องอยู่ระหว่าง 1–50 และ workload ระหว่าง 1–100",
    );
  const pairs: PairAssignment[] = [];
  let coverage = 0;
  const timestamp = a.createdAt;
  if (scope !== "individual" && (a.groupMaxScore ?? 15) > 0) {
    let distribution: ReturnType<typeof distribute> = null;
    for (coverage = Math.min(target, ids.length); coverage >= 1; coverage--) {
      distribution = distribute(a, coverage, generation);
      if (distribution) break;
    }
    if (!distribution)
      throw new AppError(
        "ไม่สามารถสร้างคู่กลุ่มได้ ต้องมีกลุ่มอื่นอย่างน้อย 2 กลุ่ม (รวมอย่างน้อย 3 กลุ่ม) และ workload เพียงพอ",
      );
    a.questions.forEach((_, i) => {
      const rng = new SeededRng(generation * 101 + i);
      distribution!.forEach((entry, j) =>
        pairs.push({
          id: `${a.id}:g${generation}:GROUP-${i}:${j}`,
          assignment_id: a.id,
          criterion_id: `GROUP-${i}`,
          side: "GROUP",
          item_a_id: entry.pair.a,
          item_b_id: entry.pair.b,
          evaluator_user_id: entry.student,
          display_left_item_id: rng.coinFlip() ? entry.pair.a : entry.pair.b,
          generation,
          source: "AUTO",
          created_at: timestamp,
        }),
      );
    });
  }
  if (scope !== "group" && (a.individualMaxScore ?? 5) > 0) {
    for (const group of a.groups) {
      if (group.members.length <= 2) continue;
      const count =
        ((group.members.length - 1) * (group.members.length - 2)) / 2;
      if (count > maximum)
        throw new AppError(
          `กลุ่ม ${group.name} ต้องทำ ${count} คู่ต่อเกณฑ์ เกิน workload ${maximum}`,
        );
      a.questions.forEach((_, i) => {
        const generated = generateIndividualPairs(
          a.id,
          `INDIVIDUAL-${i}`,
          group.id,
          group.members,
          maximum,
          generation + i,
        );
        pairs.push(
          ...generated.map((p, j) => ({
            ...p,
            id: `${a.id}:g${generation}:INDIVIDUAL-${i}:${group.id}:${j}`,
            generation,
            created_at: timestamp,
          })),
        );
      });
    }
  }
  if (!pairs.length)
    throw new AppError(
      "ไม่มีคู่ที่สร้างได้ในขอบเขตนี้ (รายบุคคลต้องมีสมาชิกอย่างน้อย 3 คนและคะแนนเต็มมากกว่า 0)",
    );
  const selected = (p: PairAssignment) =>
    scope === "both" || p.side === (scope === "group" ? "GROUP" : "INDIVIDUAL");
  const replacedIds = new Set(a.pairs?.filter(selected).map((p) => p.id));
  const affected = [
    ...new Set(
      pairs
        .map((p) => p.evaluator_user_id)
        .concat(
          a.pairs?.filter(selected).map((p) => p.evaluator_user_id) ?? [],
          a.votes.map((v) => v.userId),
        ),
    ),
  ];
  const token = JSON.stringify([
    a.pairGeneration ?? 0,
    pairingShape(a),
    a.deadline,
    scope,
    target,
    maximum,
    a.groupMaxScore,
    a.individualMaxScore,
    a.comparisons,
    a.evaluationDrafts,
    a.evaluationSubmissions,
    a.votes,
    a.scoreOverrides,
  ]);
  return {
    generation,
    scope,
    pairs,
    token,
    coverage,
    targetCoverage: target,
    affectedStudentIds: affected,
    replacedAnswers:
      (a.pairs
        ? a.comparisons?.filter((c) => replacedIds.has(c.pair_assignment_id))
            .length
        : a.votes.length) ?? 0,
    totalComparisons: pairs.length,
    workload: affected.map((id) => ({
      id,
      count: pairs.filter((p) => p.evaluator_user_id === id).length,
    })),
    disabledIndividualGroups: a.groups
      .filter((g) => g.members.length <= 2)
      .map((g) => g.name),
  };
}
