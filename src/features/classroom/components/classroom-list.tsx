"use client";

import { useState } from "react";
import { Add, GroupAddOutlined, SchoolOutlined, Search } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import type { Classroom } from "../types";
import type { Assignment } from "@/features/assignments/types";
import { ClassroomCard } from "./classroom-card";

export type ClassroomListProps = {
  classrooms: Classroom[];
  assignments?: Assignment[];
  teacher: boolean;
  onOpenCreate: () => void;
  onJoinClassroom?: (code: string) => Promise<void>;
};

export function ClassroomList({
  classrooms,
  assignments,
  teacher,
  onOpenCreate,
  onJoinClassroom,
}: ClassroomListProps) {
  const [filter, setFilter] = useState<"all" | "ACTIVE" | "ARCHIVED">("ACTIVE");
  const [query, setQuery] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const filtered = classrooms.filter((c) => {
    const matchesFilter = filter === "all" || c.status === filter;
    const matchesQuery =
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.slug.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <>
      <div className="section-toolbar">
        <div>
          <h2>ห้องเรียนของฉัน (Classrooms)</h2>
          <p>
            {teacher
              ? "จัดการห้องเรียน นำเข้ารายชื่อนักศึกษา และสร้างการประเมินแบบ Pairwise"
              : "ห้องเรียนที่คุณลงทะเบียนและเข้าร่วมการประเมินผลงาน"}
          </p>
        </div>
        {teacher ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={onOpenCreate}
            data-testid="create-classroom-button"
          >
            สร้าง Classroom ใหม่
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            startIcon={<GroupAddOutlined />}
            onClick={() => setJoinOpen(true)}
            data-testid="join-classroom-button"
          >
            กรอกรหัสเข้าร่วมห้องเรียน
          </Button>
        )}
      </div>

      <div className="list-toolbar">
        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          variant="scrollable"
          aria-label="สถานะ classroom"
        >
          <Tab value="ACTIVE" label="เปิดใช้งานอยู่" />
          <Tab value="ARCHIVED" label="เก็บถาวร" />
          <Tab value="all" label={`ทั้งหมด (${classrooms.length})`} />
        </Tabs>
        <TextField
          placeholder="ค้นหาห้องเรียน..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            htmlInput: { "aria-label": "ค้นหาห้องเรียน" },
            input: {
              startAdornment: (
                <Search sx={{ fontSize: 22, mr: 1, color: "#9ba4a5" }} />
              ),
            },
          }}
          sx={{ width: 240 }}
        />
      </div>

      {filtered.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 6,
            borderRadius: "12px",
            textAlign: "center",
            bgcolor: "background.paper",
          }}
        >
          <SchoolOutlined sx={{ fontSize: 56, color: "secondary.main", mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {query || filter !== "all"
              ? "ไม่พบห้องเรียนที่ตรงกับเงื่อนไขการค้นหา"
              : "ยังไม่มี Classroom ในระบบ"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 450, mx: "auto" }}>
            {teacher
              ? "เริ่มต้นด้วยการสร้าง Classroom เพื่อจัดกลุ่มนักศึกษา และมอบหมายภารกิจการประเมินผลงานแบบเปรียบเทียบคู่"
              : "คุณยังไม่ได้เข้าร่วมห้องเรียนใด ๆ รอคุณครูนำเข้ารายชื่อหรือส่งรหัสห้องเรียน"}
          </Typography>
          {teacher && !query && filter === "all" && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onOpenCreate}
            >
              สร้าง Classroom แรกของคุณ
            </Button>
          )}
          {!teacher && !query && filter === "all" && (
            <Button
              variant="contained"
              startIcon={<GroupAddOutlined />}
              onClick={() => setJoinOpen(true)}
            >
              กรอกรหัสเข้าร่วมห้องเรียน
            </Button>
          )}
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
            gap: 2.5,
          }}
        >
          {filtered.map((classroom) => {
            const assignmentsCount = assignments
              ? assignments.filter(
                  (a) =>
                    a.classroomId === classroom.id ||
                    classroom.assignment_ids?.includes(a.id) ||
                    a.description?.includes(classroom.slug) ||
                    a.subject.toLowerCase() === classroom.name.toLowerCase() ||
                    a.subject.toLowerCase() === classroom.slug.toLowerCase(),
                ).length
              : classroom.assignment_ids?.length || 0;
            return (
              <ClassroomCard
                key={classroom.id}
                classroom={classroom}
                assignmentsCount={assignmentsCount}
              />
            );
          })}
        </Box>
      )}

      {/* Join Classroom Dialog */}
      <Dialog
        open={joinOpen}
        onClose={() => !joining && setJoinOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!joinCode.trim()) return;
            setJoining(true);
            try {
              if (onJoinClassroom) {
                await onJoinClassroom(joinCode.trim());
              }
              setJoinOpen(false);
              setJoinCode("");
            } finally {
              setJoining(false);
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>เข้าร่วมห้องเรียน (Classroom)</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              กรอกรหัสเข้าร่วมห้องเรียนที่คุณครูให้มา (เช่น CS101-2026) เพื่อเข้าสู่ห้องเรียนและทำภารกิจการประเมิน
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="รหัสเข้าร่วมห้องเรียน"
              placeholder="เช่น CS101-2026"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
              disabled={joining}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setJoinOpen(false)} disabled={joining} color="inherit">
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained" disabled={joining || !joinCode.trim()}>
              {joining ? "กำลังเข้าร่วม..." : "เข้าร่วม"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
