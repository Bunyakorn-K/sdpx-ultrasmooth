import type { User } from "@/features/auth/types";
import { AppError } from "@/shared/domain/app-error";
import type { Assignment } from "../types";
import { validateQuestions } from "./create-assignment";
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
function joinAssignment({
  assignment,
  user,
  isMember,
  canEditGroups,
}: PolicyContext) {
  if (user.role !== "student" || !canEditGroups)
    throw new AppError("ไม่สามารถเข้าร่วม assignment นี้ได้แล้ว");
  if (!isMember) assignment.students.push({ id: user.id, name: user.name });
}
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
  if (!canEditGroups)
    throw new AppError("ไม่สามารถจัดกลุ่มได้", 403);
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
  if (!canEditGroups || hasGroup || (user.role !== "student" && !isMember))
    throw new AppError("ไม่สามารถเข้าร่วมกลุ่มได้");
  const group = assignment.groups.find((group) => group.id === input.groupId);
  if (!group) throw new AppError("ไม่พบกลุ่ม");
  if (!isMember) {
    assignment.students.push({ id: user.id, name: user.name });
  }
  group.members.push({ id: user.id, name: user.name });
}
function startVoting({ assignment, isOwner, canEditGroups }: PolicyContext) {
  if (!isOwner) throw new AppError("เฉพาะครูเจ้าของงานเท่านั้น", 403);
  const populatedGroups = assignment.groups.filter(
    (group) => group.members.length > 0,
  );
  if (
    !canEditGroups ||
    !assignment.questions.length ||
    populatedGroups.length < 2
  )
    throw new AppError(
      "ต้องมีคำถามและกลุ่มที่มีสมาชิกอย่างน้อย 2 กลุ่ม และยังไม่ถึงกำหนดส่ง",
    );
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
      individual
        ? "ไม่สามารถประเมินนักเรียนคนนี้ได้"
        : "ไม่สามารถโหวตกลุ่มนี้ได้",
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
    scores.some((score) => !Number.isInteger(score) || score < 1 || score > 5)
  )
    throw new AppError("กรุณาให้คะแนนทุกข้อ ตั้งแต่ 1–5");
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
function finalizeAssignment(
  { assignment, isOwner, user }: PolicyContext,
) {
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
      overrides: assignment.scoreOverrides ? [...assignment.scoreOverrides] : [],
    },
  };
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
const commandHandlers: Record<string, CommandHandler> = {
  join: joinAssignment,
  group: createGroup,
  joinGroup,
  start: startVoting,
  stop: stopVoting,
  questions: updateQuestions,
  vote: castVote,
  overrideScore,
  finalize: finalizeAssignment,
  reopen: reopenAssignment,
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
