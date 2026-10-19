export function canVote(input: {
  role: string | null; status: string; deadlineUtc: Date | null;
  evaluatorUserId: number; userId: number; groupId: number | null;
  itemAId: number; itemBId: number;
}, now = new Date()) {
  return input.role === "STUDENT" && input.status === "PUBLISHED"
    && (!input.deadlineUtc || input.deadlineUtc > now)
    && input.evaluatorUserId === input.userId
    && input.groupId !== null
    && input.groupId !== input.itemAId && input.groupId !== input.itemBId;
}
