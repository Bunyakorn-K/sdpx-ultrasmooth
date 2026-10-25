"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  CheckCircleOutlined,
  ErrorOutlined,
  FileUploadOutlined,
  WarningAmber,
  DownloadOutlined,
} from "@mui/icons-material";
import {
  parseRosterCsv,
  type ParseRosterResult,
} from "../domain/roster-parser";
import type { Classroom } from "../types";

export type RosterImportDialogProps = {
  open: boolean;
  onClose: () => void;
  onImportConfirm: (roster: ParseRosterResult) => void | Promise<void>;
  classroom: Classroom;
};

export function RosterImportDialog({
  open,
  onClose,
  onImportConfirm,
  classroom,
}: RosterImportDialogProps) {
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState<ParseRosterResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  function handleFileUpload(file?: File) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || "");
      try {
        const result = parseRosterCsv(text);
        setParsed(result);
        setErrorMessage("");
      } catch (err: unknown) {
        setParsed(null);
        setErrorMessage(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอ่านไฟล์",
        );
      }
    };
    reader.readAsText(file);
  }

  async function handleConfirm() {
    if (!parsed || saving) return;
    setSaving(true);
    try {
      await onImportConfirm(parsed);
      handleClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "นำเข้าไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setParsed(null);
    setErrorMessage("");
    setFileName("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        นำเข้ารายชื่อนักศึกษาและกลุ่ม (CSV Import)
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            นำเข้าไฟล์ CSV พร้อมคอลัมน์มาตรฐาน: <code>email</code>,{" "}
            <code>group_name</code>, <code>student_id</code> (ไม่บังคับ),{" "}
            <code>display_name</code> (ไม่บังคับ)
          </Typography>
          <Button
            component="a"
            href="/templates/student-roster.csv"
            download
            startIcon={<DownloadOutlined />}
            sx={{ alignSelf: "flex-start" }}
          >
            ดาวน์โหลด CSV ตัวอย่าง (12 คน / 3 กลุ่ม)
          </Button>
          <Typography variant="body2" color="text.secondary">
            ตัวอย่าง: s1@kmitl.ac.th · รหัส 67015001 · ชื่อแก้ไขได้ · Group 1
            สามารถเปลี่ยนจำนวนคนและกลุ่มในไฟล์ได้
            การนำเข้าจะสร้างรายชื่อในห้องเรียน และเตรียมสิทธิ์ให้นักศึกษา
            โดยไม่กำหนดรหัสผ่านให้ สมัครด้วยอีเมลเดียวกันเพื่อเข้ากลุ่มอัตโนมัติ
          </Typography>

          {/* Upload Box */}
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: "12px",
              textAlign: "center",
              bgcolor: "action.hover",
              borderStyle: "dashed",
            }}
          >
            <FileUploadOutlined
              sx={{ fontSize: 36, color: "secondary.main", mb: 1 }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {fileName ? fileName : "เลือกไฟล์ CSV สำหรับนำเข้า"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              หากมีแถวใดผิดพลาดจะไม่บันทึกทั้งไฟล์
              นำเข้าซ้ำด้วยอีเมลเดิมเพื่ออัปเดตข้อมูลได้
            </Typography>

            <Button
              variant="outlined"
              component="label"
              size="small"
              disabled={saving}
            >
              เลือกไฟล์ .CSV
              <input
                type="file"
                hidden
                aria-label="ไฟล์รายชื่อนักศึกษา CSV"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setParsed(null);
                  setErrorMessage("");
                  handleFileUpload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </Button>
          </Paper>

          {/* Atomic Error Report (FR-CLASS-02) */}
          {errorMessage && (
            <Alert
              severity="error"
              icon={<ErrorOutlined />}
              sx={{ borderRadius: "12px" }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                ยังไม่ได้นำเข้าข้อมูล:
              </Typography>
              <Typography variant="body2">{errorMessage}</Typography>
            </Alert>
          )}

          {/* Warnings and Success Preview (FR-CLASS-03) */}
          {parsed && (
            <Stack spacing={2}>
              <Alert
                severity="success"
                icon={<CheckCircleOutlined />}
                sx={{ borderRadius: "12px" }}
              >
                ตรวจสอบข้อมูลถูกต้อง: พบ{" "}
                <strong>{parsed.members.length}</strong> นักศึกษา ใน{" "}
                <strong>{parsed.groups.length}</strong> กลุ่ม
              </Alert>

              {parsed.warnings.length > 0 && (
                <Alert
                  severity="warning"
                  icon={<WarningAmber />}
                  sx={{ borderRadius: "12px" }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 0.5 }}
                  >
                    คำเตือน (FR-CLASS-03):
                  </Typography>
                  {parsed.warnings.map((w, i) => (
                    <Typography variant="body2" key={i}>
                      • {w}
                    </Typography>
                  ))}
                </Alert>
              )}

              {/* Preview Table */}
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ maxHeight: 200, borderRadius: "8px" }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>อีเมล</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>ชื่อ</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>กลุ่ม</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>รหัส</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        การเปลี่ยนแปลง
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsed.members.map((r, i) => {
                      const existing = classroom.members.find(
                        (m) => m.email.toLowerCase() === r.email,
                      );
                      const oldGroup = classroom.groups.find(
                        (g) => g.id === existing?.group_id,
                      )?.name;
                      return (
                        <TableRow key={i}>
                          <TableCell>{r.email}</TableCell>
                          <TableCell>{r.display_name}</TableCell>
                          <TableCell>{r.group_name}</TableCell>
                          <TableCell>{r.student_id || "-"}</TableCell>
                          <TableCell>
                            {!existing
                              ? "เพิ่มนักศึกษาใหม่"
                              : oldGroup !== r.group_name
                                ? `ย้ายกลุ่ม: ${oldGroup || "ยังไม่มีกลุ่ม"} → ${r.group_name}`
                                : "อัปเดตข้อมูล"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={handleClose} color="inherit" disabled={saving}>
          ยกเลิก
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={!parsed || saving}
        >
          {saving
            ? "กำลังนำเข้า…"
            : `ยืนยันนำเข้าข้อมูล (${parsed ? parsed.members.length : 0} คน)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
