"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Add,
  AddLinkOutlined,
  ArchiveOutlined,
  ArrowBack,
  AssignmentOutlined,
  ContentCopy,
  DeleteOutlined,
  FileUploadOutlined,
  GroupOutlined,
  PersonAddOutlined,
  SchoolOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import type { Classroom } from "../types";
import type { Assignment } from "@/features/assignments/types";
import { RosterImportDialog } from "./roster-import-dialog";
import type { ParseRosterResult } from "../domain/roster-parser";

export type ClassroomDetailProps = {
  classroom: Classroom;
  assignments: Assignment[];
  allAssignments?: Assignment[];
  teacher: boolean;
  onImportRoster: (roster: ParseRosterResult) => Promise<void>;
  onAddStaff: (input: {
    email: string;
    name: string;
    role: "CO_TEACHER" | "TA";
  }) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  onArchive: () => Promise<void>;
  onLinkAssignment?: (assignmentId: string) => Promise<void>;
  onCreateAssignment?: () => void;
  setToast: (msg: string) => void;
  setError: (msg: string) => void;
};

export function ClassroomDetail({
  classroom,
  assignments,
  allAssignments,
  teacher,
  onImportRoster,
  onAddStaff,
  onRemoveMember,
  onArchive,
  onLinkAssignment,
  onCreateAssignment,
  setToast,
  setError,
}: ClassroomDetailProps) {
  const [tab, setTab] = useState(0);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<"CO_TEACHER" | "TA">("TA");

  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedAssignmentToLink, setSelectedAssignmentToLink] = useState("");
  const [linking, setLinking] = useState(false);

  const unlinkedAssignments = useMemo(() => {
    if (!allAssignments) return [];
    return allAssignments.filter(
      (a) => !assignments.some((ca) => ca.id === a.id),
    );
  }, [allAssignments, assignments]);

  const students = classroom.members.filter((m) => m.role === "STUDENT");
  const staffMembers = classroom.members.filter(
    (m) => m.role === "OWNER" || m.role === "CO_TEACHER" || m.role === "TA",
  );

  async function handleAddStaffSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staffEmail.trim()) return;
    try {
      await onAddStaff({
        email: staffEmail.trim(),
        name: staffName.trim(),
        role: staffRole,
      });
      setToast("เพิ่มผู้สอนเรียบร้อยแล้ว");
      setStaffModalOpen(false);
      setStaffEmail("");
      setStaffName("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเพิ่มผู้สอน");
    }
  }

  async function handleRemoveMember(memberId: string, name: string) {
    if (!confirm(`คุณต้องการลบ "${name}" ออกจาก Classroom หรือไม่?`)) return;
    try {
      await onRemoveMember(memberId);
      setToast("ลบสมาชิกเรียบร้อยแล้ว");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ไม่สามารถลบสมาชิกได้");
    }
  }

  async function handleArchiveClassroom() {
    if (
      !confirm(
        "คุณต้องการเก็บ Classroom นี้เข้าคลังถาวร (Archive) หรือไม่? ห้องเรียนจะอยู่ในสถานะอ่านอย่างเดียว",
      )
    ) {
      return;
    }
    try {
      await onArchive();
      setToast("เก็บ Classroom ถาวรแล้ว");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ไม่สามารถเก็บ Classroom ได้");
    }
  }

  return (
    <>
      <Button
        component={Link}
        href="/classrooms"
        color="inherit"
        startIcon={<ArrowBack />}
        sx={{ mb: 2, pl: 0 }}
      >
        กลับไปรายการห้องเรียน
      </Button>

      {/* Classroom Header */}
      <Box sx={{ mb: 4 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            mb: 2,
          }}
        >
          <Box>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", mb: 1 }}
            >
              <Chip
                size="small"
                label={
                  classroom.status === "ACTIVE"
                    ? "ห้องเรียนที่เปิดใช้งาน"
                    : "เก็บถาวร (Archived)"
                }
                color={classroom.status === "ACTIVE" ? "secondary" : "default"}
              />
              <Typography variant="body2" color="text.secondary">
                รหัสเข้าร่วม: <strong>{classroom.slug}</strong>
                <IconButton
                  size="small"
                  aria-label="คัดลอกรหัสเข้าร่วม"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(classroom.slug)
                      .then(() => setToast("คัดลอกรหัสเข้าร่วมแล้ว"))
                      .catch(() => setError(`รหัสเข้าร่วม: ${classroom.slug}`))
                  }
                >
                  <ContentCopy sx={{ fontSize: 16 }} />
                </IconButton>
              </Typography>
            </Stack>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
              {classroom.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              เขตเวลา {classroom.timezone} · นักศึกษา {students.length} คน ·{" "}
              {classroom.groups.length} กลุ่ม
            </Typography>
          </Box>

          {teacher && classroom.status === "ACTIVE" && (
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ flexWrap: "wrap", gap: 1 }}
            >
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<FileUploadOutlined />}
                onClick={() => setRosterOpen(true)}
              >
                นำเข้ารายชื่อ (CSV)
              </Button>
              {onCreateAssignment && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={onCreateAssignment}
                >
                  สร้าง Assignment ในห้องนี้
                </Button>
              )}
              <IconButton
                color="default"
                title="เก็บถาวร (Archive)"
                onClick={handleArchiveClassroom}
              >
                <ArchiveOutlined />
              </IconButton>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Tabs */}
      <Tabs
        value={!teacher && tab === 3 ? 0 : tab}
        onChange={(_, val) => setTab(val)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="แท็บข้อมูล Classroom"
        sx={{ borderBottom: "1px solid #e8ecea", mb: 3 }}
      >
        <Tab
          icon={<AssignmentOutlined />}
          iconPosition="start"
          label={`Assignment (${assignments.length})`}
        />
        <Tab
          icon={<GroupOutlined />}
          iconPosition="start"
          label={`นักศึกษาและกลุ่ม (${students.length} คน)`}
        />
        <Tab
          icon={<SchoolOutlined />}
          iconPosition="start"
          label={`ผู้สอน & TA (${staffMembers.length} คน)`}
        />
        {teacher && (
          <Tab
            icon={<SettingsOutlined />}
            iconPosition="start"
            label="การตั้งค่าห้องเรียน"
          />
        )}
      </Tabs>

      {/* Tab 0: Assignments */}
      {(tab === 0 || (!teacher && tab === 3)) && (
        <Stack spacing={2.5}>
          {assignments.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                borderRadius: "12px",
                textAlign: "center",
                bgcolor: "background.paper",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                ยังไม่มี Assignment ในห้องเรียนนี้
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                สร้างการประเมินผลงานแบบ Pairwise
                เพื่อให้นักศึกษาในห้องเรียนนี้เริ่มเปรียบเทียบคู่
              </Typography>
              {teacher && (
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    justifyContent: "center",
                    mt: 1,
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  {onCreateAssignment && (
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={onCreateAssignment}
                    >
                      สร้าง Assignment แรก
                    </Button>
                  )}
                  {onLinkAssignment && unlinkedAssignments.length > 0 && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<AddLinkOutlined />}
                      onClick={() => {
                        setSelectedAssignmentToLink(
                          unlinkedAssignments[0]?.id || "",
                        );
                        setLinkOpen(true);
                      }}
                    >
                      เชื่อมโยง Assignment ที่มีอยู่ ({unlinkedAssignments.length})
                    </Button>
                  )}
                </Stack>
              )}
            </Paper>
          ) : (
            <>
              {teacher &&
                onLinkAssignment &&
                unlinkedAssignments.length > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      startIcon={<AddLinkOutlined />}
                      onClick={() => {
                        setSelectedAssignmentToLink(
                          unlinkedAssignments[0]?.id || "",
                        );
                        setLinkOpen(true);
                      }}
                    >
                      เชื่อมโยง Assignment ที่มีอยู่ ({unlinkedAssignments.length})
                    </Button>
                  </Box>
                )}
              {assignments.map((assignment) => (
                <Paper
                  key={assignment.id}
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {assignment.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {assignment.subject} · {assignment.groups.length} กลุ่ม ·
                      สิ้นสุด:{" "}
                      {new Date(assignment.deadline).toLocaleString("th-TH")}
                    </Typography>
                  </Box>
                  <Button
                    component={Link}
                    href={`/assignments/${encodeURIComponent(assignment.id)}`}
                    variant="outlined"
                    size="small"
                  >
                    ดูรายละเอียด
                  </Button>
                </Paper>
              ))}
            </>
          )}
        </Stack>
      )}

      {/* Tab 1: Students & Groups (FR-CLASS-01..05) */}
      {tab === 1 && (
        <Stack spacing={2.5}>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                รายชื่อนักศึกษาและกลุ่มผลงาน (Roster & Groups)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                จัดการรายชื่อนักศึกษา กลุ่ม และสถานะการเปิดใช้งาน (FR-CLASS-01 ถึง
                FR-CLASS-05)
              </Typography>
            </Box>
            {teacher && classroom.status === "ACTIVE" && (
              <Button
                variant="outlined"
                startIcon={<FileUploadOutlined />}
                onClick={() => setRosterOpen(true)}
              >
                นำเข้า / อัปเดต CSV
              </Button>
            )}
          </Stack>

          {students.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{ p: 4, borderRadius: "12px", textAlign: "center" }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                ยังไม่มีรายชื่อนักศึกษาใน Classroom นี้
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                นำเข้ารายชื่อผ่านไฟล์ CSV เพื่อสร้างกลุ่มและนักศึกษาอัตโนมัติ
              </Typography>
              {teacher && (
                <Button
                  variant="contained"
                  startIcon={<FileUploadOutlined />}
                  onClick={() => setRosterOpen(true)}
                >
                  นำเข้ารายชื่อ (CSV)
                </Button>
              )}
            </Paper>
          ) : (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: "12px" }}
            >
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>ชื่อ - นามสกุล</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>อีเมล</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>รหัสนักศึกษา</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>กลุ่ม</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                    {teacher && (
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        จัดการ
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student) => {
                    const group = classroom.groups.find(
                      (g) => g.id === student.group_id,
                    );
                    return (
                      <TableRow key={student.id}>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {student.display_name}
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.student_id || "-"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={group?.name || "ไม่มีกลุ่ม"}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              student.status === "ACTIVE"
                                ? "ใช้งานแล้ว"
                                : "รอล็อกอิน (Pending)"
                            }
                            color={
                              student.status === "ACTIVE"
                                ? "success"
                                : "warning"
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        {teacher && (
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={`ลบ ${student.display_name}`}
                              onClick={() =>
                                handleRemoveMember(
                                  student.id,
                                  student.display_name,
                                )
                              }
                            >
                              <DeleteOutlined sx={{ fontSize: 18 }} />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      )}

      {/* Tab 2: Co-teachers & TAs (FR-CLASS-06) */}
      {tab === 2 && (
        <Stack spacing={2.5}>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                ผู้สอนร่วมและผู้ช่วยสอน (Co-teachers & TAs)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                อาจารย์ผู้รับผิดชอบสามารถเพิ่มหรือถอดถอนผู้สอนร่วมและ TA ได้ (FR-CLASS-06)
              </Typography>
            </Box>
            {teacher && classroom.status === "ACTIVE" && (
              <Button
                variant="contained"
                startIcon={<PersonAddOutlined />}
                onClick={() => setStaffModalOpen(true)}
              >
                เพิ่มผู้สอน / TA
              </Button>
            )}
          </Stack>

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ borderRadius: "12px" }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ผู้สอน</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>อีเมล</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>บทบาท</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>สถานะ</TableCell>
                  {teacher && (
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      จัดการ
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {staffMembers.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {staff.display_name}
                    </TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          staff.role === "OWNER"
                            ? "อาจารย์ผู้รับผิดชอบ (Owner)"
                            : staff.role === "CO_TEACHER"
                              ? "อาจารย์ร่วม (Co-teacher)"
                              : "ผู้ช่วยสอน (TA)"
                        }
                        color={staff.role === "OWNER" ? "primary" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          staff.status === "ACTIVE" ? "เข้าใช้งานแล้ว" : "รอล็อกอิน"
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    {teacher && (
                      <TableCell align="right">
                        {staff.role !== "OWNER" && (
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`ลบ ${staff.display_name}`}
                            onClick={() =>
                              handleRemoveMember(staff.id, staff.display_name)
                            }
                          >
                            <DeleteOutlined sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {/* Tab 3: Settings */}
      {teacher && tab === 3 && (
        <Paper
          variant="outlined"
          sx={{ p: 3, borderRadius: "12px", bgcolor: "background.paper" }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            การตั้งค่าห้องเรียน (Classroom Settings)
          </Typography>
          <Stack spacing={2} sx={{ maxWidth: 600 }}>
            <TextField
              label="เขตเวลา (Timezone)"
              value={classroom.timezone}
              disabled
              helperText="กำหนดระบบเวลาสำหรับการปิดรับงานและการสรุปคะแนนอัตโนมัติ"
            />
            <TextField
              label="โดเมนอีเมลที่อนุญาต (Allowed Domains)"
              value={
                classroom.allowed_email_domains.join(", ") || "อนุญาตทุกโดเมน"
              }
              disabled
              helperText="ข้อจำกัดโดเมนสำหรับนักศึกษาที่เข้าร่วม (FR-AUTHZ-02)"
            />
            {classroom.status === "ACTIVE" && teacher && (
              <Box sx={{ pt: 2 }}>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<ArchiveOutlined />}
                  onClick={handleArchiveClassroom}
                >
                  เก็บห้องเรียนเข้าคลังถาวร (Archive)
                </Button>
              </Box>
            )}
          </Stack>
        </Paper>
      )}

      {/* Roster Import Dialog */}
      <RosterImportDialog
        classroom={classroom}
        open={teacher && rosterOpen}
        onClose={() => setRosterOpen(false)}
        onImportConfirm={async (roster) => {
          await onImportRoster(roster);
          setToast(
            `นำเข้ารายชื่อสำเร็จ: ${roster.members.length} คน ใน ${roster.groups.length} กลุ่ม`,
          );
        }}
      />

      {/* Add Staff Modal */}
      <Dialog
        open={teacher && staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handleAddStaffSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>เพิ่มผู้สอนหรือผู้ช่วยสอน</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField
                label="อีเมล"
                type="email"
                required
                fullWidth
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
              />
              <TextField
                label="ชื่อ - นามสกุล"
                fullWidth
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />
              <TextField
                select
                label="บทบาท"
                fullWidth
                value={staffRole}
                onChange={(e) =>
                  setStaffRole(e.target.value as "CO_TEACHER" | "TA")
                }
              >
                <MenuItem value="CO_TEACHER">อาจารย์ร่วม (Co-teacher)</MenuItem>
                <MenuItem value="TA">
                  ผู้ช่วยสอน (Teaching Assistant - TA)
                </MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button color="inherit" onClick={() => setStaffModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="contained">
              บันทึก
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Link Existing Assignment Dialog */}
      <Dialog
        open={teacher && linkOpen}
        onClose={() => !linking && setLinkOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selectedAssignmentToLink || !onLinkAssignment) return;
            setLinking(true);
            try {
              await onLinkAssignment(selectedAssignmentToLink);
              setLinkOpen(false);
            } catch (err: unknown) {
              setError(
                err instanceof Error
                  ? err.message
                  : "เกิดข้อผิดพลาดในการเชื่อมโยง Assignment",
              );
            } finally {
              setLinking(false);
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            เชื่อมโยง Assignment เข้าห้องเรียนนี้
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              เลือก Assignment ที่คุณเคยสร้างไว้ เพื่อนำเข้ามาอยู่ในห้องเรียนนี้
            </Typography>
            <TextField
              select
              label="เลือก Assignment"
              fullWidth
              value={selectedAssignmentToLink}
              onChange={(e) => setSelectedAssignmentToLink(e.target.value)}
              disabled={linking}
              required
            >
              {unlinkedAssignments.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.title} ({a.subject})
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              color="inherit"
              disabled={linking}
              onClick={() => setLinkOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={linking || !selectedAssignmentToLink}
            >
              {linking ? "กำลังเชื่อมโยง..." : "เชื่อมโยง"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
