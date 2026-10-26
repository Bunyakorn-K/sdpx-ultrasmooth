export type NotificationKind =
  | "assignment_opened"
  | "deadline_reminder"
  | "results_finalized"
  | "pairs_regenerated"
  | "additional_evaluation";
export type NotificationEvent = {
  kind: NotificationKind | "pairs_paused" | "pairs_reopened";
  key: string;
  recipientIds?: string[];
  reason?: string;
  generation?: number;
  scope?: string;
};
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
