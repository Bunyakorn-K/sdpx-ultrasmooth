import test from "node:test";
import assert from "node:assert/strict";
import { AssignmentService } from "@/features/assignments/server/assignment-service";
import { FakeAssignmentRepository } from "../fakes/fake-assignment-repository";
import { makeVotingFixture } from "../factories";

for (const evaluationType of ["group", "individual"] as const) {
  test(`${evaluationType} votes persist every integer choice from 1 through 6`, async () => {
    for (const choice of [1, 2, 3, 4, 5, 6]) {
      const { assignment, student, other } = makeVotingFixture();
      assignment.evaluationMode = evaluationType;
      if (evaluationType === "individual") {
        assignment.groups[0].members.push(...assignment.groups[1].members);
        assignment.groups.splice(1, 1);
      }
      const repository = new FakeAssignmentRepository([assignment]);
      const service = new AssignmentService(repository, () => "123456");

      await service.execute(student, {
        action: "vote",
        id: assignment.id,
        ...(evaluationType === "individual"
          ? { studentId: other.id }
          : { groupId: assignment.groups[1].id }),
        scores: [choice, choice],
      });

      const saved = await repository.findById(assignment.id);
      assert.equal(saved?.assignment.votes.length, 1);
      assert.deepEqual(saved?.assignment.votes[0].scores, [choice, choice]);
    }
  });

  test(`${evaluationType} votes reject invalid or incomplete choices without saving`, async () => {
    for (const scores of [
      [7, 6],
      [0, 6],
      [-1, 6],
      [1.5, 6],
      ["6", 6],
      [null, 6],
      [6],
      [],
      [6, 6, 6],
    ]) {
      const { assignment, student, other } = makeVotingFixture();
      assignment.evaluationMode = evaluationType;
      if (evaluationType === "individual") {
        assignment.groups[0].members.push(...assignment.groups[1].members);
        assignment.groups.splice(1, 1);
      }
      const repository = new FakeAssignmentRepository([assignment]);
      const service = new AssignmentService(repository, () => "123456");
      await assert.rejects(
        service.execute(student, {
          action: "vote",
          id: assignment.id,
          ...(evaluationType === "individual"
            ? { studentId: other.id }
            : { groupId: assignment.groups[1].id }),
          scores,
        }),
        /กรุณาให้คะแนนทุกข้อ ตั้งแต่ 1–6/,
      );
      assert.deepEqual(
        (await repository.findById(assignment.id))?.assignment.votes,
        [],
      );
    }
  });
}
