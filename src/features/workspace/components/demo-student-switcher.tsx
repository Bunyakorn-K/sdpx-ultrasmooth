"use client";

import { MenuItem, TextField } from "@mui/material";
import { demoStudents } from "@/features/auth/data/demo-users";
import type { Assignment } from "@/features/assignments/types";

export function DemoStudentSwitcher({
  userId,
  assignment,
  onChange,
}: {
  userId: string;
  assignment?: Assignment;
  onChange: (id: string) => void;
}) {
  return (
    <TextField
      select
      label="นักเรียนสาธิต"
      value={userId}
      onChange={(event) => onChange(event.target.value)}
      sx={{ width: { xs: "100%", sm: 300 }, maxWidth: "100%" }}
    >
      {demoStudents.map((student) => {
        const group = assignment?.groups.find((candidate) =>
          candidate.members.some((member) => member.id === student.id),
        );
        return (
          <MenuItem key={student.id} value={student.id}>
            {student.name}
            {group ? ` · ${group.name}` : ""}
          </MenuItem>
        );
      })}
    </TextField>
  );
}
