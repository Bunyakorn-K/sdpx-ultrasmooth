"use client";

import Link from "next/link";
import {
  AccessTime,
  GroupOutlined,
  MenuBookOutlined,
  SchoolOutlined,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { Classroom } from "../types";

export type ClassroomCardProps = {
  classroom: Classroom;
  assignmentsCount?: number;
};

export function ClassroomCard({ classroom, assignmentsCount: customCount }: ClassroomCardProps) {
  const studentsCount = classroom.members.filter((m) => m.role === "STUDENT").length;
  const groupsCount = classroom.groups.length;
  const assignmentsCount =
    customCount !== undefined ? customCount : classroom.assignment_ids?.length || 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        bgcolor: classroom.status === "ARCHIVED" ? "action.hover" : "background.paper",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        "&:hover": {
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          borderColor: "secondary.main",
        },
      }}
      data-testid="classroom-card"
    >
      <Box>
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}
        >
          <Chip
            size="small"
            label={classroom.status === "ACTIVE" ? "ใช้งานอยู่" : "เก็บถาวร (Archived)"}
            color={classroom.status === "ACTIVE" ? "secondary" : "default"}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
              รหัสเข้าร่วม:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "secondary.main" }}>
              {classroom.slug}
            </Typography>
          </Box>
        </Stack>

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, minHeight: 48 }}>
          {classroom.name}
        </Typography>

        <Stack spacing={1} sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <SchoolOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              นักศึกษา <strong>{studentsCount}</strong> คน
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <GroupOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              กลุ่มผลงาน <strong>{groupsCount}</strong> กลุ่ม
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <MenuBookOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              Assignment <strong>{assignmentsCount}</strong> ชิ้นงาน
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <AccessTime sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="caption" color="text.disabled">
              เขตเวลา {classroom.timezone}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Button
        component={Link}
        href={`/classrooms/${encodeURIComponent(classroom.id)}`}
        variant="outlined"
        color="secondary"
        fullWidth
        sx={{ borderRadius: "8px", fontWeight: 600 }}
      >
        เข้าสู่ห้องเรียน
      </Button>
    </Paper>
  );
}
