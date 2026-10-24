import test from "node:test";
import assert from "node:assert/strict";
import { NotificationService } from "@/features/notifications/server/notification-service";
import type {
  NotificationRepository,
  NotificationCursor,
} from "@/features/notifications/data/notification-repository";
import type { NotificationEvent } from "@/features/notifications/types";
import type { Assignment } from "@/features/assignments/types";
import { FakeAssignmentRepository } from "../fakes/fake-assignment-repository";
import { makeVotingFixture } from "../factories";
import { AssignmentService } from "@/features/assignments/server/assignment-service";

class Inbox implements NotificationRepository {
  reminders = new Set<string>();
  calls: {
    user: string;
    ids: string[];
    id?: string;
    cursor?: NotificationCursor;
  }[] = [];
  async remind(
    userId: string,
    _assignment: Assignment,
    event: NotificationEvent,
  ) {
    this.reminders.add(`${userId}:${event.key}`);
  }
  async list(user: string, ids: string[], cursor?: NotificationCursor) {
    this.calls.push({ user, ids, cursor });
    return { items: [], unreadCount: this.reminders.size, nextCursor: null };
  }
  async read(user: string, ids: string[], id?: string) {
    this.calls.push({ user, ids, id });
    return id === undefined || id === "own-notice";
  }
}

test("inbox creates idempotent reminders for the signed-in student's accessible assignments", async () => {
  const { assignment, student, other, teacher } = makeVotingFixture();
  const inbox = new Inbox();
  const service = new NotificationService(
    inbox,
    new FakeAssignmentRepository([assignment]),
  );
  await service.list(student);
  await service.list(student);
  assert.equal(inbox.reminders.size, 1);
  assert.deepEqual(inbox.calls[0].ids, [assignment.id]);
  assert.equal(inbox.calls[0].user, student.id);
  await service.list(other);
  assert.equal(inbox.reminders.size, 2);
  await assert.rejects(() => service.list(teacher), { status: 403 });
});

test("read operations use the authenticated owner and current scope, including read-all", async () => {
  const { assignment, student, teacher } = makeVotingFixture();
  const inbox = new Inbox();
  const service = new NotificationService(
    inbox,
    new FakeAssignmentRepository([assignment]),
  );
  await service.read(student, "own-notice");
  await service.read(student);
  assert.equal(inbox.calls[0].user, student.id);
  assert.deepEqual(inbox.calls[0].ids, [assignment.id]);
  await assert.rejects(() => service.read(student, "someone-elses-notice"), {
    status: 404,
  });
  await assert.rejects(() => service.read(teacher), { status: 403 });
});

test("history pagination does not regenerate deadline reminders", async () => {
  const { assignment, student } = makeVotingFixture();
  const inbox = new Inbox();
  const cursor = { time: new Date().toISOString(), id: crypto.randomUUID() };
  await new NotificationService(
    inbox,
    new FakeAssignmentRepository([assignment]),
  ).list(student, cursor);
  assert.equal(inbox.reminders.size, 0);
  assert.deepEqual(inbox.calls[0].cursor, cursor);
});

test("assignment service passes lifecycle events with successful optimistic updates", async () => {
  const { assignment, teacher } = makeVotingFixture();
  assignment.status = "draft";
  class Repository extends FakeAssignmentRepository {
    committed: NotificationEvent[] = [];
    async update(next: Assignment, version: number, event?: NotificationEvent) {
      const saved = await super.update(next, version);
      if (saved && event) this.committed.push(event);
      return saved;
    }
  }
  const repository = new Repository([assignment]);
  const service = new AssignmentService(repository, () => "123456");
  await service.execute(teacher, { action: "start", id: assignment.id });
  await assert.rejects(() =>
    service.execute(teacher, { action: "start", id: assignment.id }),
  );
  await service.execute(teacher, { action: "stop", id: assignment.id });
  await service.execute(teacher, { action: "finalize", id: assignment.id });
  assert.deepEqual(
    repository.committed.map((event) => event.kind),
    ["assignment_opened", "results_finalized"],
  );
});
