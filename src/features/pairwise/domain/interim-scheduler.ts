import type { Assignment } from "@/features/assignments/types";

/**
 * FR-SCORE-06: Daily 02:00 in classroom timezone recomputation check.
 * Returns true if 02:00 in the given timezone has arrived or passed today
 * and lastInterimAt was either never recorded or was before today's 02:00 window.
 */
export function isInterimRecomputationDue(
  lastInterimAt: string | undefined,
  timezone: string = "Asia/Bangkok",
  now: Date = new Date(),
): boolean {
  if (!lastInterimAt) return true;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const nowParts = formatter.formatToParts(now);
    const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
      parts.find((p) => p.type === type)?.value;

    const currentHour = parseInt(getPart(nowParts, "hour") || "0", 10);
    const currentDay = getPart(nowParts, "day");
    const currentMonth = getPart(nowParts, "month");
    const currentYear = getPart(nowParts, "year");

    const lastTime = new Date(lastInterimAt).getTime();
    if (isNaN(lastTime)) return true;

    // If more than 24 hours have elapsed, it is always due
    if (now.getTime() - lastTime >= 24 * 60 * 60 * 1000) return true;

    const lastParts = formatter.formatToParts(new Date(lastInterimAt));
    const lastDay = getPart(lastParts, "day");
    const lastMonth = getPart(lastParts, "month");
    const lastYear = getPart(lastParts, "year");

    const isSameDayInTimezone =
      lastDay === currentDay &&
      lastMonth === currentMonth &&
      lastYear === currentYear;

    // If it's on or past 02:00 in the classroom timezone and the last run was from a prior day
    if (currentHour >= 2 && !isSameDayInTimezone) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Updates an assignment's interim recomputation timestamp.
 */
export function applyInterimRecompute(
  assignment: Assignment,
  now: Date = new Date(),
): Assignment {
  assignment.lastInterimAt = now.toISOString();
  return assignment;
}
