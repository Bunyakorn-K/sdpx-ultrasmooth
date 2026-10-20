export interface VotingReadiness {
  ready: boolean;
  questionCount: number;
  groupCount: number;
  message: string;
}

// Students score every group except their own, so voting needs at least two
// groups and something to score them on.
export function votingReadiness(input: { questionCount: number; groupCount: number }): VotingReadiness {
  const { questionCount, groupCount } = input;
  const missing = [
    questionCount < 1 ? "add at least 1 question" : null,
    groupCount < 2 ? "wait for at least 2 groups" : null,
  ].filter(Boolean);
  return {
    ready: missing.length === 0,
    questionCount,
    groupCount,
    message: missing.length === 0
      ? `Ready: ${groupCount} groups, ${questionCount} question${questionCount === 1 ? "" : "s"}.`
      : `Not ready yet: ${missing.join(" and ")}.`,
  };
}
