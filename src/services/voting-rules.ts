/**
 * 5-point rating: any student in the classroom may score any group except
 * their own, from 1 to 5, while voting is open. Students without a group
 * may score every group.
 */
export function canRate(input: {
  role: string | null; status: string; deadlineUtc: Date | null;
  ownGroupId: number | null; targetGroupId: number; score: number;
}, now = new Date()) {
  return input.role === "STUDENT" && input.status === "PUBLISHED"
    && (!input.deadlineUtc || input.deadlineUtc > now)
    && input.ownGroupId !== input.targetGroupId
    && Number.isInteger(input.score) && input.score >= 1 && input.score <= 5;
}
