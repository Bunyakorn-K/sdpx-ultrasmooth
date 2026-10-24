import type { User } from "@/features/auth/types";
import type { AssignmentRepository } from "@/features/assignments/server/assignment-repository";
import { AppError } from "@/shared/domain/app-error";
import { deadlineReminder } from "../domain/notification-policy";
import type {
  NotificationRepository,
  NotificationCursor,
} from "../data/notification-repository";

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly assignments: AssignmentRepository,
  ) {}
  private async accessible(user: User) {
    if (user.role !== "student")
      throw new AppError("Notifications are available to students.", 403);
    return this.assignments.listForUser(user.id, user.email);
  }
  async list(user: User, cursor?: NotificationCursor) {
    const assignments = await this.accessible(user);
    if (!cursor)
      for (const assignment of assignments) {
        const reminder = deadlineReminder(assignment, user.id);
        if (reminder)
          await this.repository.remind(user.id, assignment, reminder);
      }
    return this.repository.list(
      user.id,
      assignments.map((assignment) => assignment.id),
      cursor,
    );
  }
  async read(user: User, id?: string) {
    const assignments = await this.accessible(user);
    if (
      !(await this.repository.read(
        user.id,
        assignments.map((assignment) => assignment.id),
        id,
      ))
    )
      throw new AppError("Notification not found.", 404);
  }
}
