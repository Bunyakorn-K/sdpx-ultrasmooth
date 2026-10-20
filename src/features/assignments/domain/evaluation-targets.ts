import type { Assignment } from "../types";

export function isIndividualEvaluation(assignment: Assignment) {
  return assignment.evaluationMode === "individual";
}

export function evaluationTargets(assignment: Assignment) {
  return isIndividualEvaluation(assignment)
    ? assignment.students
    : assignment.groups;
}

export function targetVotes(assignment: Assignment, targetId: string) {
  return assignment.votes.filter((vote) =>
    isIndividualEvaluation(assignment)
      ? vote.studentId === targetId
      : vote.groupId === targetId,
  );
}

export function canEvaluateTarget(
  assignment: Assignment,
  userId: string,
  targetId: string,
) {
  if (!assignment.students.some((student) => student.id === userId))
    return false;
  const ownGroup = assignment.groups.find((group) =>
    group.members.some((member) => member.id === userId),
  );
  if (isIndividualEvaluation(assignment)) {
    const targetGroup = assignment.groups.find((group) =>
      group.members.some((member) => member.id === targetId),
    );
    // FR-PAIR-03: evaluator MUST evaluate peers within their own group, excluding themselves
    return (
      !!ownGroup &&
      !!targetGroup &&
      targetGroup.id === ownGroup.id &&
      targetId !== userId &&
      assignment.students.some((student) => student.id === targetId)
    );
  }
  // FR-PAIR-02: evaluator MUST NOT receive pairs containing their own group
  return (
    !!ownGroup &&
    targetId !== ownGroup.id &&
    assignment.groups.some(
      (group) => group.id === targetId && group.members.length > 0,
    )
  );
}
