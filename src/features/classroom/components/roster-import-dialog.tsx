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
} from "@mui/icons-material";
import {
  parseRosterCsv,
  type ParseRosterResult,
} from "../domain/roster-parser";

export type RosterImportDialogProps = {
  open: boolean;
  onClose: () => void;
  onImportConfirm: (roster: ParseRosterResult) => void;
};

export function RosterImportDialog({
  open,
  onClose,
  onImportConfirm,
}: RosterImportDialogProps) {
  const [, setCsvContent] = useState<string>("");
  const [parsed, setParsed] = useState<ParseRosterResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  function handleFileUpload(file?: File) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || "");
      setCsvContent(text);
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

  function handleConfirm() {
    if (parsed) {
      onImportConfirm(parsed);
      handleClose();
    }
  }

  function handleClose() {
    setCsvContent("");
    setParsed(null);
    setErrorMessage("");
    setFileName("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        นำเข้ารายชื่อนักศึกษาและกลุ่ม (CSV Import)
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            นำเข้าไฟล์ CSV พร้อมคอลัมน์มาตรฐาน:{" "}
            <code>email</code>, <code>group_name</code>,{" "}
            <code>student_id</code> (ไม่บังคับ), <code>display_name</code> (ไม่บังคับ)
            ตามข้อกำหนด <strong>FR-CLASS-01</strong>
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
            <FileUploadOutlined sx={{ fontSize: 36, color: "secondary.main", mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {fileName ? fileName : "เลือกไฟล์ CSV สำหรับนำเข้า"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              ระบบตรวจสอบความถูกต้องแบบ Atomic (FR-CLASS-02): หากมีแถวใดผิดพลาดจะปฏิเสธทั้งไฟล์
            </Typography>

            <Button variant="outlined" component="label" size="small">
              เลือกไฟล์ .CSV
              <input
                type="file"
                hidden
                accept=".csv,text/csv"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
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
                ปฏิเสธการนำเข้าทั้งไฟล์ (FR-CLASS-02):
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
                ตรวจสอบข้อมูลถูกต้อง: พบ <strong>{parsed.members.length}</strong> นักศึกษา ใน{" "}
                <strong>{parsed.groups.length}</strong> กลุ่ม
              </Alert>

              {parsed.warnings.length > 0 && (
                <Alert
                  severity="warning"
                  icon={<WarningAmber />}
                  sx={{ borderRadius: "12px" }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
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
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200, borderRadius: "8px" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>อีเมล</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>กลุ่ม</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>รหัส</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsed.members.slice(0, 10).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.group_name}</TableCell>
                        <TableCell>{r.student_id || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={handleClose} color="inherit">
          ยกเลิก
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={!parsed || !!errorMessage}
        >
          ยืนยันนำเข้าข้อมูล ({parsed ? parsed.members.length : 0} คน)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
