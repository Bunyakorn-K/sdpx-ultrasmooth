export type NotificationKind =
  "assignment_opened" | "deadline_reminder" | "results_finalized";
export type NotificationEvent = { kind: NotificationKind; key: string };
export type Notification = {
  id: string;
  assignmentId: string;
  kind: NotificationKind;
  createdAt: string;
  readAt: string | null;
};
export type NotificationPage = {
  items: Notification[];
  unreadCount: number;
  nextCursor: string | null;
};
