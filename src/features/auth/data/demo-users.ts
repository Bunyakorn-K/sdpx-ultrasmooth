import type { User } from "../types";

export const demoTeacher: User = {
  id: "demo-teacher",
  name: "ครูอรยา",
  email: "teacher@example.com",
  role: "teacher",
};

export const demoStudent: User = {
  id: "demo-student",
  name: "นักเรียนตัวอย่าง",
  email: "student@example.com",
  role: "student",
};

export const demoOtherStudent: User = {
  id: "s3",
  name: "พิมพ์ชนก",
  email: "student-other@example.com",
  role: "student",
};

export const demoStudents = [demoStudent, demoOtherStudent];
export const demoUsers = [demoTeacher, ...demoStudents];
