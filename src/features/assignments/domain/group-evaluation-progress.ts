import type { Assignment, Group } from "../types";

export function groupEvaluationProgress(assignment: Assignment, group: Group) {
  const source =
    assignment.status === "finalized" &&
    assignment.finalizedSnapshot?.inputs.pairs
      ? assignment.finalizedSnapshot.inputs
      : assignment;
  const names = new Map(
    source.groups.flatMap((item) => [
      [item.id, item.name] as const,
      ...item.members.map((member) => [member.id, member.name] as const),
    ]),
  );
  const responses = new Map(
    (source.comparisons ?? [])
      .filter((response) => response.status !== "DRAFT")
      .map((response) => [response.pair_assignment_id, response]),
  );
  return group.members.map((member) => {
    const tasks = (source.pairs ?? [])
      .filter((pair) => pair.evaluator_user_id === member.id)
      .map((pair) => {
        const candidate = responses.get(pair.id);
        const response =
          candidate?.evaluator_user_id === member.id ? candidate : undefined;
        const left = pair.display_left_item_id;
        const right = left === pair.item_a_id ? pair.item_b_id : pair.item_a_id;
        const criterionIndex = Number(pair.criterion_id.split("-").at(-1));
        return {
          pair,
          response,
          leftName: names.get(left) ?? left,
          rightName: names.get(right) ?? right,
          criterionName: source.questions[criterionIndex] ?? pair.criterion_id,
        };
      });
    return {
      member,
      tasks,
      submitted: tasks.filter((task) => task.response).length,
    };
  });
}
