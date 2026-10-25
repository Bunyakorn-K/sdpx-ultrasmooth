import type { Classroom } from "@/features/classroom/types";
import type { Assignment } from "../types";

/** Published generations keep their roster; drafts always use the current classroom. */
export function applyClassroomRoster(
  assignment: Assignment,
  classroom: Classroom,
): Assignment {
  if (assignment.status !== "draft" || assignment.finalizedSnapshot)
    return assignment;
  const students = classroom.members.filter(
    (member) => member.role === "STUDENT",
  );
  const student = (member: (typeof students)[number]) => ({
    id: member.user_id,
    name: member.display_name,
    studentId: member.student_id,
  });
  return {
    ...assignment,
    classroomId: classroom.id,
    classroomRosterManaged: true,
    students: students.map(student),
    groups: classroom.groups.map((group) => ({
      id: group.id,
      name: group.name,
      members: students
        .filter((member) => member.group_id === group.id)
        .map(student),
    })),
  };
}
