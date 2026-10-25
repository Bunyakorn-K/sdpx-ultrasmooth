import type { User } from "@/features/auth/types";
import { AppError } from "@/shared/domain/app-error";
import type { Assignment } from "../types";
import type { PairScope } from "../types";
import {
  pairingShape,
  previewRegeneration,
} from "@/features/pairwise/domain/regeneration";
import type { ComparisonChoice } from "@/features/pairwise/types";
import { validateQuestions } from "./create-assignment";
import { saveEvaluation } from "@/features/pairwise/domain/evaluation-submission";
import { submitAppeal, resolveAppeal } from "./appeals";
import {
  canEvaluateTarget,
  isIndividualEvaluation,
  targetVotes,
} from "./evaluation-targets";

type CommandInput = Record<string, unknown>;
type PolicyContext = {
  assignment: Assignment;
  user: User;
  isOwner: boolean;
  isMember: boolean;
  canEditGroups: boolean;
  hasGroup: boolean;
};
type CommandHandler = (context: PolicyContext, input: CommandInput) => void;
function createGroup(
  {
    assignment,
    user,
    isOwner,
    isMember,
    canEditGroups,
    hasGroup,
  }: PolicyContext,
  input: CommandInput,
) {
  if (assignment.classroomRosterManaged)
    throw new AppError("กรุณาจัดกลุ่มผ่าน CSV ของห้องเรียน", 403);
  if (!canEditGroups) throw new AppError("ไม่สามารถจัดกลุ่มได้", 403);
  if (!isOwner && user.role !== "student")
    throw new AppError("ไม่สามารถจัดกลุ่มได้", 403);
  if (!isOwner && hasGroup) throw new AppError("คุณอยู่ในกลุ่มแล้ว");
  const name = String(input.name || "").trim();
  if (!name || name.length > 100)
    throw new AppError("กรุณาระบุชื่อกลุ่มไม่เกิน 100 ตัวอักษร");
  if (!isOwner && !isMember) {
    assignment.students.push({ id: user.id, name: user.name });
  }
  assignment.groups.push({
    id: crypto.randomUUID(),
    name,
    members: isOwner ? [] : [{ id: user.id, name: user.name }],
  });
}
function joinGroup(
  { assignment, user, isMember, canEditGroups, hasGroup }: PolicyContext,
  input: CommandInput,
) {
  if (assignment.classroomRosterManaged)
    throw new AppError("อาจารย์จัดกลุ่มให้ผ่านรายชื่อห้องเรียนแล้ว", 403);
  if (!canEditGroups || hasGroup || (user.role !== "student" && !isMember))
    throw new AppError("ไม่สามารถเข้าร่วมกลุ่มได้");
  const group = assignment.groups.find((group) => group.id === input.groupId);
  if (!group) throw new AppError("ไม่พบกลุ่ม");
  if (!isMember) {
    assignment.students.push({ id: user.id, name: user.name });
  }
  group.members.push({ id: user.id, name: user.name });
}
function startVoting(context: PolicyContext, input: CommandInput) {
  const { assignment, isOwner, canEditGroups } = context;
  if (!isOwner) throw new AppError("เฉพาะครูเจ้าของงานเท่านั้น", 403);
  if (assignment.pairwiseRequired) {
    if (
      assignment.status !== "draft" ||
      assignment.pairs ||
      assignment.pairingPaused
    )
      throw new AppError("กรุณาใช้ Re-generate Pairs เพื่อเผยแพร่คู่ชุดใหม่", 409);
    if (!canEditGroups) throw new AppError("ยังไม่สามารถเปิดประเมินได้");
    // Always recompute against current state, including on optimistic-lock retries.
    // The preview token prevents publishing a roster/configuration the owner did not review.
    regeneratePairs(context, {
      ...input,
      scope: "both",
      reason: "เปิดประเมินครั้งแรก",
    });
    // Initial publication has no previous generation to archive.
    const initial = assignment.pairHistory?.at(-1);
    if (
      initial?.generation === 0 &&
      !initial.votes.length &&
      !initial.pairs.length
    )
      assignment.pairHistory?.pop();
    return;
  }
  if (assignment.pairingPaused)
    throw new AppError("กรุณาสร้างและเผยแพร่คู่ใหม่ก่อนเปิดประเมิน", 409);
  const populatedGroups = assignment.groups.filter(
    (group) => group.members.length > 0,
  );
  if (
    !canEditGroups ||
    !assignment.questions.length ||
    populatedGroups.length < 2
  )
    throw new AppError("ต้องมีคำถามและกลุ่มที่มีสมาชิกอย่างน้อย 2 กลุ่ม และยังไม่ถึงกำหนดส่ง");
  assignment.status = "active";
}
function stopVoting({ assignment, isOwner }: PolicyContext) {
  if (!isOwner) throw new AppError("เฉพาะครูเจ้าของงานเท่านั้น", 403);
  if (assignment.status !== "active") throw new AppError("ยังไม่ได้เปิดโหวต");
  assignment.status = "closed";
}
function updateQuestions(
  { assignment, isOwner }: PolicyContext,
  input: CommandInput,
) {
  if (!isOwner || assignment.status !== "draft")
    throw new AppError("แก้ไขคำถามได้ก่อนเริ่มโหวตเท่านั้น", 403);
  assignment.questions = validateQuestions(input.questions);
}
function castVote(
  { assignment, user, isMember }: PolicyContext,
  input: CommandInput,
) {
  if (assignment.pairs)
    throw new AppError("กรุณาประเมินผ่านคู่ที่ได้รับใน generation ล่าสุด", 409);
  const expired = new Date(assignment.deadline).getTime() <= Date.now();
  if (
    !isMember ||
    user.role !== "student" ||
    assignment.status !== "active" ||
    expired
  )
    throw new AppError("ยังไม่เปิดโหวตหรือหมดเวลาแล้ว");
  const individual = isIndividualEvaluation(assignment);
  const targetId = individual ? input.studentId : input.groupId;
  if (individual ? input.groupId !== undefined : input.studentId !== undefined)
    throw new AppError("ผู้รับการประเมินไม่ตรงกับรูปแบบของ assignment");
  if (
    typeof targetId !== "string" ||
    !canEvaluateTarget(assignment, user.id, targetId)
  )
    throw new AppError(
      individual ? "ไม่สามารถประเมินนักเรียนคนนี้ได้" : "ไม่สามารถโหวตกลุ่มนี้ได้",
    );
  const alreadyVoted = targetVotes(assignment, targetId).some(
    (vote) => vote.userId === user.id,
  );
  if (alreadyVoted)
    throw new AppError(
      individual ? "คุณประเมินนักเรียนคนนี้แล้ว" : "คุณโหวตกลุ่มนี้แล้ว",
      409,
    );
  const scores = input.scores;
  if (
    !Array.isArray(scores) ||
    scores.length !== assignment.questions.length ||
    scores.some((score) => !Number.isInteger(score) || score < 1 || score > 6)
  )
    throw new AppError("กรุณาให้คะแนนทุกข้อ ตั้งแต่ 1–6");
  if (!assignment.students.some((s) => s.id === user.id)) {
    assignment.students.push({ id: user.id, name: user.name });
  }
  assignment.votes.push({
    userId: user.id,
    ...(individual ? { studentId: targetId } : { groupId: targetId }),
    scores,
    createdAt: new Date().toISOString(),
  });
}
function overrideScore(
  { assignment, isOwner, user }: PolicyContext,
  input: CommandInput,
) {
  if (!isOwner) throw new AppError("เฉพาะครูเจ้าของงานเท่านั้น", 403);
  const targetId = String(input.targetId || "").trim();
  const targetType = input.targetType === "student" ? "student" : "group";
  const overriddenScore = Number(input.score);
  const reason = String(input.reason || "").trim();

  if (!targetId) throw new AppError("ต้องระบุ targetId ในการแก้ไขคะแนน", 400);
  if (isNaN(overriddenScore) || overriddenScore < 0) {
    throw new AppError("คะแนนต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0", 400);
  }
  // FR-SCORE-08: บังคับกรอกเหตุผล
  if (!reason) {
    throw new AppError("กรุณาระบุเหตุผลในการแก้ไขคะแนน (FR-SCORE-08)", 400);
  }

  assignment.scoreOverrides = assignment.scoreOverrides || [];
  assignment.scoreOverrides.push({
    targetId,
    targetType,
    overriddenScore,
    reason,
    overriddenBy: user.id,
    overriddenAt: new Date().toISOString(),
  });
}
function finalizeAssignment({ assignment, isOwner, user }: PolicyContext) {
  if (!isOwner) throw new AppError("เฉพาะครูเจ้าของงานเท่านั้น", 403);
  if (assignment.status !== "closed") {
    throw new AppError("สามารถ Finalize ได้เฉพาะงานที่ปิดรับการประเมินแล้วเท่านั้น", 400);
  }

  // FR-SCORE-09: Snapshot inputs and outputs
  assignment.status = "finalized";
  assignment.finalizedSnapshot = {
    finalizedAt: new Date().toISOString(),
    finalizedBy: user.id,
    inputs: {
      votes: JSON.parse(JSON.stringify(assignment.votes)),
      groups: JSON.parse(JSON.stringify(assignment.groups)),
      questions: [...assignment.questions],
    },
    outputs: {
      overrides: assignment.scoreOverrides
        ? [...assignment.scoreOverrides]
        : [],
    },
  };
  if (assignment.pairs) {
    assignment.finalizedSnapshot.inputs.pairs = structuredClone(
      assignment.pairs,
    );
    assignment.finalizedSnapshot.inputs.comparisons = structuredClone(
      assignment.comparisons ?? [],
    );
  }
}
function reopenAssignment(
  { assignment, isOwner }: PolicyContext,
  input: CommandInput,
) {
  if (!isOwner) throw new AppError("เฉพาะครูเจ้าของงานเท่านั้น", 403);
  if (assignment.status !== "finalized") {
    throw new AppError("สามารถ Reopen ได้เฉพาะงานที่ Finalize แล้วเท่านั้น", 400);
  }
  const reason = String(input.reason || "").trim();
  if (!reason) {
    throw new AppError("กรุณาระบุเหตุผลในการเปิดประเมินใหม่ (FR-ASSIGN-03)", 400);
  }
  assignment.status = "closed";
  assignment.reopenReason = reason;
}
function updateDeadline(
  { assignment, isOwner }: PolicyContext,
  input: CommandInput,
) {
  if (!isOwner) throw new AppError("เฉพาะครูเจ้าของงานเท่านั้น", 403);
  if (assignment.status === "finalized") {
    throw new AppError("ไม่สามารถแก้ไขกำหนดส่งของงานที่ Finalize แล้ว", 400);
  }

  const newDeadlineStr = String(input.deadline || "").trim();
  const newDeadlineTime = new Date(newDeadlineStr).getTime();
  if (isNaN(newDeadlineTime)) {
    throw new AppError("รูปแบบวันเวลาสิ้นสุดไม่ถูกต้อง", 400);
  }

  const currentDeadlineTime = new Date(assignment.deadline).getTime();
  const now = Date.now();

  // FR-ASSIGN-04: ขยาย deadline ได้ทุกเมื่อ · ร่นเข้าได้เฉพาะเมื่อยังไม่ถึง deadline เดิม
  const isShortening = newDeadlineTime < currentDeadlineTime;
  if (isShortening) {
    if (now >= currentDeadlineTime) {
      throw new AppError(
        "ไม่สามารถร่นกำหนดส่งได้เนื่องจากเลยกำหนดส่งเดิมแล้ว (FR-ASSIGN-04)",
        400,
      );
    }
    if (newDeadlineTime <= now) {
      throw new AppError("กำหนดส่งที่ร่นเข้ามาต้องเป็นเวลาในอนาคต", 400);
    }
  }

  const isExtension = newDeadlineTime > currentDeadlineTime;
  assignment.deadline = new Date(newDeadlineTime).toISOString();
  if (isExtension && assignment.status === "closed" && newDeadlineTime > now) {
    assignment.status = "active";
  }
}
function pairingOwner(context: PolicyContext, input: CommandInput) {
  if (!context.isOwner) throw new AppError("เฉพาะครูเจ้าของงานเท่านั้น", 403);
  if (!String(input.reason || "").trim() || String(input.reason).length > 1000)
    throw new AppError("กรุณาระบุเหตุผลไม่เกิน 1000 ตัวอักษร");
  if (input.expectedGeneration !== (context.assignment.pairGeneration ?? 0))
    throw new AppError("ชุดคู่เปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด", 409);
}
function unpublishPairs(context: PolicyContext, input: CommandInput) {
  pairingOwner(context, input);
  const a = context.assignment;
  if (a.status !== "active" && a.status !== "closed")
    throw new AppError(
      "ต้องเปิดผลใหม่ก่อนหาก Finalized แล้ว หรืองานอยู่ใน Draft อยู่แล้ว",
      409,
    );
  a.status = "draft";
  a.pairingSnapshot ??= {
    groups: structuredClone(a.groups),
    questions: [...a.questions],
  };
  a.pairingPaused = true;
  a.pairingReason = String(input.reason).trim();
}
function configurePairs(context: PolicyContext, input: CommandInput) {
  pairingOwner(context, input);
  const a = context.assignment;
  if (a.status !== "draft")
    throw new AppError("แก้การตั้งค่าได้ใน Draft เท่านั้น", 409);
  const target = Number(input.targetCoverage);
  const workload = Number(input.maxWorkload);
  const deadline = new Date(String(input.deadline)).getTime();
  if (
    !Number.isInteger(target) ||
    target < 1 ||
    target > 50 ||
    !Number.isInteger(workload) ||
    workload < 1 ||
    workload > 100 ||
    !Number.isFinite(deadline) ||
    deadline <= Date.now()
  )
    throw new AppError(
      "Coverage 1–50, workload 1–100 และกำหนดส่งต้องเป็นเวลาในอนาคต",
    );
  a.targetCoverage = target;
  a.maxWorkload = workload;
  a.deadline = new Date(deadline).toISOString();
}
function regeneratePairs(context: PolicyContext, input: CommandInput) {
  pairingOwner(context, input);
  const a = context.assignment;
  const plan = previewRegeneration(a, input.scope as PairScope);
  if (plan.token !== input.previewToken)
    throw new AppError("ข้อมูลเปลี่ยนแล้ว กรุณาดูตัวอย่างใหม่ก่อนยืนยัน", 409);
  const selected = (side: string) =>
    input.scope === "both" ||
    side === (input.scope === "group" ? "GROUP" : "INDIVIDUAL");
  const oldPairs = a.pairs?.filter((p) => selected(p.side)) ?? [];
  const oldIds = new Set(oldPairs.map((p) => p.id));
  a.pairHistory ??= [];
  a.pairHistory.push({
    generation: a.pairGeneration ?? 0,
    reason: String(input.reason).trim(),
    changedAt: new Date().toISOString(),
    changedBy: context.user.id,
    pairs: structuredClone(oldPairs),
    comparisons: structuredClone(
      a.comparisons?.filter((c) => oldIds.has(c.pair_assignment_id)) ?? [],
    ),
    evaluationDrafts: structuredClone(
      a.evaluationDrafts?.filter((c) => oldIds.has(c.pair_assignment_id)) ?? [],
    ),
    evaluationSubmissions: structuredClone(
      a.evaluationSubmissions?.filter((s) => selected(s.side)) ?? [],
    ),
    votes: structuredClone(a.votes),
    groups: structuredClone(a.pairingSnapshot?.groups ?? a.groups),
    questions: [...(a.pairingSnapshot?.questions ?? a.questions)],
    finalizedSnapshot: a.finalizedSnapshot
      ? structuredClone(a.finalizedSnapshot)
      : undefined,
    scoreOverrides: structuredClone(a.scoreOverrides ?? []),
  });
  a.pairs = [
    ...(a.pairs?.filter((p) => !selected(p.side)) ?? []),
    ...plan.pairs.map((p) => ({ ...p, created_at: new Date().toISOString() })),
  ];
  a.comparisons =
    a.comparisons?.filter((c) => !oldIds.has(c.pair_assignment_id)) ?? [];
  a.evaluationDrafts =
    a.evaluationDrafts?.filter((c) => !oldIds.has(c.pair_assignment_id)) ?? [];
  a.evaluationSubmissions =
    a.evaluationSubmissions?.filter((s) => !selected(s.side)) ?? [];
  a.votes = [];
  a.scoreOverrides = [];
  delete a.finalizedSnapshot;
  a.pairGeneration = plan.generation;
  a.pairingShape = pairingShape(a);
  a.pairingSnapshot = {
    groups: structuredClone(a.groups),
    questions: [...a.questions],
  };
  a.pairingPaused = false;
  a.pairingReason = String(input.reason).trim();
  a.status = "active";
}
function submitPair(context: PolicyContext, input: CommandInput) {
  const a = context.assignment;
  if (
    context.user.role !== "student" ||
    !context.isMember ||
    a.status !== "active" ||
    new Date(a.deadline).getTime() <= Date.now()
  )
    throw new AppError("ยังไม่เปิดประเมินหรือหมดเวลาแล้ว", 403);
  if (input.expectedGeneration !== a.pairGeneration)
    throw new AppError("ชุดคู่เปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุด", 409);
  const pair = a.pairs?.find(
    (p) => p.id === input.pairId && p.evaluator_user_id === context.user.id,
  );
  if (!pair) throw new AppError("ไม่พบคู่ที่คุณมีสิทธิ์ประเมิน", 403);
  if (
    a.evaluationSubmissions?.some(
      (s) => s.evaluatorId === context.user.id && s.side === pair.side,
    )
  )
    throw new AppError("กรุณาส่งผลประเมินรวมจากหน้าประเมินล่าสุด", 409);
  if (
    !Number.isInteger(input.choice) ||
    Number(input.choice) < 1 ||
    Number(input.choice) > 6
  )
    throw new AppError("กรุณาเลือกคะแนนตั้งแต่ 1–6");
  const time = new Date().toISOString();
  const response = {
    id: `response:${pair.id}`,
    pair_assignment_id: pair.id,
    evaluator_user_id: context.user.id,
    choice: input.choice as ComparisonChoice,
    status: "SUBMITTED" as const,
    time_on_task_ms: Math.max(
      0,
      Math.min(86400000, Number(input.timeOnTaskMs) || 0),
    ),
    saved_at: time,
    submitted_at: time,
  };
  a.comparisons ??= [];
  const index = a.comparisons.findIndex(
    (c) => c.pair_assignment_id === pair.id,
  );
  if (index >= 0) throw new AppError("คุณส่งผลประเมินคู่นี้แล้ว", 409);
  a.comparisons.push(response);
}
const commandHandlers: Record<string, CommandHandler> = {
  submitAppeal: ({ assignment, user }, input) =>
    submitAppeal(assignment, user, input),
  resolveAppeal: ({ assignment, user }, input) =>
    resolveAppeal(assignment, user, input),
  saveEvaluationDrafts: (context, input) =>
    saveEvaluation(context.assignment, context.user, input, false),
  submitEvaluation: (context, input) =>
    saveEvaluation(context.assignment, context.user, input, true),
  configurePairs,
  unpublishPairs,
  regeneratePairs,
  submitPair,
  group: createGroup,
  joinGroup,
  start: startVoting,
  stop: stopVoting,
  questions: updateQuestions,
  vote: castVote,
  overrideScore,
  finalize: finalizeAssignment,
  reopen: reopenAssignment,
  updateDeadline,
};
export function applyAssignmentCommand(
  assignment: Assignment,
  user: User,
  command: string,
  input: CommandInput,
): Assignment {
  if (!Object.hasOwn(commandHandlers, command))
    throw new AppError("ไม่พบการทำงาน");
  const handler = commandHandlers[command];
  handler(
    {
      assignment,
      user,
      isOwner: assignment.ownerId === user.id && user.role === "teacher",
      isMember:
        assignment.students.some((student) => student.id === user.id) ||
        assignment.groups.some((group) =>
          group.members.some((member) => member.id === user.id),
        ),
      canEditGroups:
        assignment.status === "draft" &&
        new Date(assignment.deadline).getTime() > Date.now(),
      hasGroup: assignment.groups.some((group) =>
        group.members.some((member) => member.id === user.id),
      ),
    },
    input,
  );
  return assignment;
}
