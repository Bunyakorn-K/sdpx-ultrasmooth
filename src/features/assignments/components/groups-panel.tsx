"use client";

import Link from "next/link";
import { Add, FileUploadOutlined, GroupsOutlined } from "@mui/icons-material";
import { Alert, Avatar, Button, Chip, Paper, Stack } from "@mui/material";

import type { User } from "@/features/auth/types";
import type { Assignment } from "../types";

export function GroupsPanel({
  active,
  teacher,
  user,
  busy,
  action,
  openModal,
}: {
  active: Assignment;
  teacher: boolean;
  user: User | null;
  busy: boolean;
  action: (command: string, input?: Record<string, unknown>) => Promise<void>;
  openModal: (mode: "group" | "questions") => void;
}) {
  return (
    <>
      <div className="section-toolbar">
        <div>
          <h3>รายชื่อกลุ่มและสมาชิก (FR-CLASS-01)</h3>
          <p>
            {active.students.length} นักเรียน · {active.groups.length} กลุ่ม
          </p>
        </div>
        {active.status === "draft" &&
          (teacher ||
            !active.groups.some((g) =>
              g.members.some((m) => m.id === user?.id),
            )) && (
            <Stack direction="row" spacing={1.5}>
              {teacher && (
                <Button
                  variant="outlined"
                  component={Link}
                  href={
                    active.classroomId
                      ? `/classrooms/${encodeURIComponent(active.classroomId)}`
                      : "/classrooms"
                  }
                  startIcon={<FileUploadOutlined />}
                >
                  นำเข้ารายชื่อ (CSV)
                </Button>
              )}
              {!active.classroomRosterManaged && (
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => openModal("group")}
                >
                  สร้างกลุ่ม
                </Button>
              )}
            </Stack>
          )}
      </div>
      {active.classroomRosterManaged && (
        <Alert severity="info" sx={{ mb: 2 }}>
          กลุ่มถูกกำหนดโดยอาจารย์จาก CSV ของห้องเรียน นักศึกษาไม่ต้องสร้างหรือเลือกกลุ่ม
          {teacher &&
            " · แก้ไขได้ที่ห้องเรียน งาน Draft จะใช้รายชื่อล่าสุด ส่วนงานที่เปิดประเมินแล้วต้องนำกลับเป็น Draft และสร้างคู่ใหม่"}
        </Alert>
      )}

      <div className="group-grid">
        {active.groups.map((g, i) => (
          <Paper
            variant="outlined"
            className="group-card"
            data-testid="group-card"
            key={g.id}
            sx={{ borderRadius: "12px" }}
          >
            <span
              className={`stat-icon ${["mint", "blue", "pink", "cream"][i % 4]}`}
            >
              <GroupsOutlined />
            </span>
            <h3>
              {teacher ? (
                <Link
                  href={`/assignments/${encodeURIComponent(active.id)}/groups/${encodeURIComponent(g.id)}`}
                >
                  {g.name}
                </Link>
              ) : (
                g.name
              )}
            </h3>
            <p>
              {g.members.length} สมาชิก{" "}
              {g.members.some((m) => m.id === user?.id) && (
                <Chip
                  component="span"
                  size="small"
                  label="กลุ่มของฉัน"
                  color="secondary"
                  variant="outlined"
                />
              )}
            </p>
            <div className="member-list">
              {g.members.map((m) => (
                <span key={m.id}>
                  <Avatar
                    sx={{
                      width: 25,
                      height: 25,
                      fontSize: 14,
                      bgcolor: "#f0f3f1",
                      color: "#6f8980",
                    }}
                  >
                    {m.name[0]}
                  </Avatar>
                  {m.name}
                </span>
              ))}
            </div>
            {teacher && (
              <Button
                component={Link}
                href={`/assignments/${encodeURIComponent(active.id)}/groups/${encodeURIComponent(g.id)}`}
                fullWidth
                variant="outlined"
              >
                ดูการโหวตของสมาชิก
              </Button>
            )}
            {!teacher &&
              !active.classroomRosterManaged &&
              active.status === "draft" &&
              !active.groups.some((g) =>
                g.members.some((m) => m.id === user?.id),
              ) && (
                <Button
                  fullWidth
                  variant="outlined"
                  disabled={busy}
                  onClick={() => action("joinGroup", { groupId: g.id })}
                >
                  เข้าร่วมกลุ่มนี้
                </Button>
              )}
          </Paper>
        ))}
      </div>

      {!active.groups.length && (
        <div className="empty-state">
          <GroupsOutlined />
          <h3>ยังไม่มีกลุ่ม นำเข้ารายชื่อผ่าน CSV หรือสร้างกลุ่มใหม่ได้เลย</h3>
        </div>
      )}

      {teacher && (
        <div className="ungrouped">
          <h3>นักเรียนที่ยังไม่มีกลุ่ม</h3>
          <p>
            {active.students
              .filter(
                (s) =>
                  !active.groups.some((g) =>
                    g.members.some((m) => m.id === s.id),
                  ),
              )
              .map((s) => s.name)
              .join(", ") || "ไม่มี"}
          </p>
        </div>
      )}
    </>
  );
}
