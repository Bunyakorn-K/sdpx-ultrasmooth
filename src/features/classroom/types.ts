export type ClassroomRole = "OWNER" | "CO_TEACHER" | "TA" | "STUDENT";
export type ClassroomStatus = "ACTIVE" | "ARCHIVED";
export type ClassroomMemberStatus = "PENDING" | "ACTIVE";

export type ClassroomMember = {
  id: string;
  classroom_id: string;
  user_id: string;
  role: ClassroomRole;
  group_id?: string | null;
  joined_at: string;
  display_name: string;
  email: string;
  student_id?: string;
  status: ClassroomMemberStatus;
};

export type ClassroomGroup = {
  id: string;
  classroom_id: string;
  name: string;
  created_at: string;
};

export type Classroom = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  allowed_email_domains: string[];
  status: ClassroomStatus;
  created_by: string;
  created_at: string;
  members: ClassroomMember[];
  groups: ClassroomGroup[];
  assignment_ids?: string[];
};

export type CreateClassroomInput = {
  name: string;
  slug?: string;
  timezone?: string;
  allowed_email_domains?: string[];
};
