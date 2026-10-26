import test from "node:test";
import assert from "node:assert/strict";
import {
  createAssignment,
  cloneAssignment,
} from "@/features/assignments/domain/create-assignment";
import { applyAssignmentCommand } from "@/features/assignments/domain/assignment-policy";
import { previewRegeneration } from "@/features/pairwise/domain/regeneration";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";

const teacher: User = {
  id: "t1",
  name: "Teacher One",
  email: "t1@uni.ac.th",
  role: "teacher",
};
const student: User = {
  id: "s1",
  name: "Student One",
  email: "s1@uni.ac.th",
  role: "student",
};

function fixture(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: "asgn-life-1",
    ownerId: teacher.id,
    title: "Project Alpha",
    description: "Initial description",
    subject: "Software Engineering",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: "draft",
    questions: ["Quality", "Presentation"],
    groups: [
      {
        id: "g1",
        name: "Group 1",
        members: [
          { id: "s1", name: "Student 1" },
          { id: "s2", name: "Student 2" },
        ],
      },
      {
        id: "g2",
        name: "Group 2",
        members: [
          { id: "s3", name: "Student 3" },
          { id: "s4", name: "Student 4" },
        ],
      },
      {
        id: "g3",
        name: "Group 3",
        members: [
          { id: "s5", name: "Student 5" },
          { id: "s6", name: "Student 6" },
        ],
      },
    ],
    students: [
      { id: "s1", name: "Student 1" },
      { id: "s2", name: "Student 2" },
      { id: "s3", name: "Student 3" },
      { id: "s4", name: "Student 4" },
      { id: "s5", name: "Student 5" },
      { id: "s6", name: "Student 6" },
    ],
    votes: [],
    createdAt: new Date().toISOString(),
    color: "mint",
    groupMaxScore: 15,
    individualMaxScore: 5,
    targetCoverage: 3,
    ...overrides,
  };
}

test("FR-ASSIGN-01: createAssignment preserves artifactUrl and separate deadlines", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const indivFuture = new Date(Date.now() + 172800000).toISOString();
  const asgn = createAssignment(
    {
      title: "Assignment with Artifact",
      deadline: future,
      individualDeadline: indivFuture,
      artifactUrl: "https://drive.google.com/folder/123",
      questions: ["Completeness"],
    },
    teacher,
  );

  assert.equal(asgn.artifactUrl, "https://drive.google.com/folder/123");
  assert.equal(asgn.deadline, new Date(future).toISOString());
  assert.equal(asgn.individualDeadline, new Date(indivFuture).toISOString());
});

test("FR-ASSIGN-02: previewRegeneration validates that criteria weights total 100% (±0.01)", () => {
  const asgn = fixture();

  // Case 1: Default questions divide evenly (50% + 50% = 100%) -> Valid
  const plan = previewRegeneration(asgn, "both");
  assert.ok(plan.pairs.length > 0);

  // Case 2: Custom weights sum to 90% -> Rejected
  const invalidAsgn = fixture({
    criteriaWeights: {
      "GROUP-0": 50,
      "GROUP-1": 40, // sum = 90%
    },
  });
  assert.throws(
    () => previewRegeneration(invalidAsgn, "group"),
    /ผลรวมน้ำหนักของเกณฑ์การประเมินฝั่ง GROUP ต้องเท่ากับ 100%/,
  );

  // Case 3: Custom weights sum to 100% -> Accepted
  const validAsgn = fixture({
    criteriaWeights: {
      "GROUP-0": 70,
      "GROUP-1": 30, // sum = 100%
    },
  });
  const validPlan = previewRegeneration(validAsgn, "group");
  assert.ok(validPlan.pairs.length > 0);
});

test("FR-ASSIGN-03: unpublishPairs reverts active or closed assignment to draft and pauses pairs", () => {
  const asgn = fixture({ status: "active", pairGeneration: 1, pairs: [] });

  // Student cannot unpublish
  assert.throws(
    () =>
      applyAssignmentCommand(asgn, student, "unpublishPairs", {
        reason: "Student try",
        expectedGeneration: 1,
      }),
    /เฉพาะครูเจ้าของงานเท่านั้น/,
  );

  // Teacher unpublishes with reason
  applyAssignmentCommand(asgn, teacher, "unpublishPairs", {
    reason: "Need to update criteria before continuing",
    expectedGeneration: 1,
  });

  assert.equal(asgn.status, "draft");
  assert.equal(asgn.pairingPaused, true);
  assert.equal(asgn.pairingReason, "Need to update criteria before continuing");
  assert.ok(asgn.pairingSnapshot);
});

test("FR-ASSIGN-06: cloneAssignment creates a fresh draft with future deadline and duplicated configuration", () => {
  // Source assignment is closed with past deadline and accumulated votes/results
  const past = new Date(Date.now() - 86400000).toISOString();
  const source = fixture({
    status: "closed",
    deadline: past,
    artifactUrl: "https://drive.google.com/test",
    groupMaxScore: 20,
    individualMaxScore: 10,
    scoreFloor: 0.5,
    scoreCeiling: 0.9,
    targetCoverage: 4,
    instructorWeight: 2.0,
    votes: [{ userId: "s1", groupId: "g2", scores: [5, 4], createdAt: past }],
    pairs: [
      {
        id: "p1",
        assignment_id: "asgn-life-1",
        criterion_id: "c1",
        side: "GROUP",
        item_a_id: "g1",
        item_b_id: "g2",
        evaluator_user_id: "s1",
        display_left_item_id: "g1",
        generation: 1,
        source: "AUTO",
        created_at: past,
      },
    ],
  });

  const cloned = cloneAssignment(source, teacher);

  // Cloned assignment MUST be in draft status
  assert.equal(cloned.status, "draft");
  // Cloned assignment MUST have a distinct new UUID
  assert.notEqual(cloned.id, source.id);
  // Title defaults to including (สำเนา)
  assert.equal(cloned.title, `${source.title} (สำเนา)`);
  // Deadline MUST be reset to a future date (not copying the expired deadline)
  assert.ok(new Date(cloned.deadline).getTime() > Date.now());
  // Configuration is faithfully copied
  assert.equal(cloned.artifactUrl, source.artifactUrl);
  assert.equal(cloned.groupMaxScore, 20);
  assert.equal(cloned.individualMaxScore, 10);
  assert.equal(cloned.scoreFloor, 0.5);
  assert.equal(cloned.scoreCeiling, 0.9);
  assert.equal(cloned.targetCoverage, 4);
  assert.equal(cloned.instructorWeight, 2.0);
  assert.deepEqual(cloned.questions, source.questions);
  // Answers and pairs are zeroed out
  assert.equal(cloned.votes.length, 0);
  assert.equal(cloned.pairs, undefined);
  assert.equal(cloned.comparisons, undefined);
  assert.equal(cloned.finalizedSnapshot, undefined);
  assert.equal(cloned.maxWorkload, 8);
});

test("FR-ASSIGN-01 SEC: createAssignment sanitizes artifactUrl and prevents javascript: XSS", () => {
  const future = new Date(Date.now() + 86400000).toISOString();

  // javascript: scheme must throw
  assert.throws(
    () =>
      createAssignment(
        {
          title: "Malicious URL",
          deadline: future,
          artifactUrl: "javascript:alert(document.cookie)",
        },
        teacher,
      ),
    /ลิงก์ผลงานต้องเริ่มต้นด้วย http:\/\/ หรือ https:\/\//,
  );

  // valid https is accepted
  const valid = createAssignment(
    {
      title: "Valid URL",
      deadline: future,
      artifactUrl: "https://github.com/project/docs",
    },
    teacher,
  );
  assert.equal(valid.artifactUrl, "https://github.com/project/docs");
});

test("FR-ASSIGN-07: createAssignment preserves individualMaxScore = 0 without resetting to default", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const zeroIndiv = createAssignment(
    {
      title: "Group Only",
      deadline: future,
      individualMaxScore: 0,
      groupMaxScore: 0,
    },
    teacher,
  );
  assert.equal(zeroIndiv.individualMaxScore, 0);
  assert.equal(zeroIndiv.groupMaxScore, 0);
});

test("FR-ASSIGN-04: updateDeadline validates extension, shortening, and ownership invariants", () => {
  const currentDeadline = new Date(Date.now() + 3600000).toISOString();
  const asgn = fixture({ deadline: currentDeadline, status: "closed" });

  // Student cannot update deadline
  assert.throws(
    () =>
      applyAssignmentCommand(asgn, student, "updateDeadline", {
        deadline: new Date(Date.now() + 7200000).toISOString(),
      }),
    /เฉพาะครูเจ้าของงานเท่านั้น/,
  );

  // Extend deadline on closed assignment reopens to active
  const futureExt = new Date(Date.now() + 7200000).toISOString();
  applyAssignmentCommand(asgn, teacher, "updateDeadline", {
    deadline: futureExt,
  });
  assert.equal(asgn.deadline, new Date(futureExt).toISOString());
  assert.equal(asgn.status, "active");

  // Shorten deadline to valid future time is permitted
  const futureShorten = new Date(Date.now() + 5000000).toISOString();
  applyAssignmentCommand(asgn, teacher, "updateDeadline", {
    deadline: futureShorten,
  });
  assert.equal(asgn.deadline, new Date(futureShorten).toISOString());

  // Shortening to a past time is rejected
  assert.throws(
    () =>
      applyAssignmentCommand(asgn, teacher, "updateDeadline", {
        deadline: new Date(Date.now() - 1000).toISOString(),
      }),
    /กำหนดส่งที่ร่นเข้ามาต้องเป็นเวลาในอนาคต/,
  );
});
