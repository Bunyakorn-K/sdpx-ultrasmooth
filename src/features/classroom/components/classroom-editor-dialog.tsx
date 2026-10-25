"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { CreateClassroomInput } from "../types";

export type ClassroomEditorDialogProps = {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (input: CreateClassroomInput) => Promise<void>;
};

export function ClassroomEditorDialog({
  open,
  busy,
  onClose,
  onSubmit,
}: ClassroomEditorDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState("Asia/Bangkok");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [error, setError] = useState("");

  function handleClose() {
    setName("");
    setSlug("");
    setTimezone("Asia/Bangkok");
    setAllowedDomains("");
    setError("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("กรุณากรอกชื่อห้องเรียน");
      return;
    }

    try {
      const domains = allowedDomains
        .split(",")
        .map((d) => d.trim().toLowerCase().replace(/^[@.]/, ""))
        .filter(Boolean);

      await onSubmit({
        name: name.trim(),
        slug: slug.trim() || undefined,
        timezone: timezone.trim() || "Asia/Bangkok",
        allowed_email_domains: domains.length > 0 ? domains : undefined,
      });
      handleClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสร้างห้องเรียน",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !busy && handleClose()}
      maxWidth="sm"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>สร้าง Classroom ใหม่</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              สร้างพื้นที่ห้องเรียนสำหรับการจัดกลุ่ม นำเข้ารายชื่อนักศึกษา
              และสร้างการประเมินผลงานเปรียบเทียบคู่ (FR-CLASS-01)
            </Typography>

            <TextField
              label="ชื่อห้องเรียน (Classroom Name)"
              required
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น CS101 การเขียนโปรแกรมเบื้องต้น ภาคเรียน 1/2569"
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />

            <TextField
              label="รหัสอ้างอิง / Slug (ถ้าไม่ระบุ ระบบจะสร้างจากชื่อให้อัตโนมัติ)"
              fullWidth
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="เช่น cs101-2569-1"
              helperText="ใช้สำหรับอ้างอิงและจัดระเบียบในระบบ"
            />

            <TextField
              select
              label="เขตเวลา (Timezone)"
              fullWidth
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              helperText="กำหนดเวลา deadline และการคำนวณคะแนน interim ประจำวัน (§9.4)"
            >
              <MenuItem value="Asia/Bangkok">
                Asia/Bangkok (UTC+07:00 — ประเทศไทย)
              </MenuItem>
              <MenuItem value="Asia/Singapore">
                Asia/Singapore (UTC+08:00)
              </MenuItem>
              <MenuItem value="Asia/Tokyo">Asia/Tokyo (UTC+09:00)</MenuItem>
              <MenuItem value="UTC">UTC (เวลาสากล)</MenuItem>
            </TextField>

            <TextField
              label="โดเมนอีเมลที่อนุญาต (คั่นด้วยเครื่องหมายจุลภาค , )"
              fullWidth
              value={allowedDomains}
              onChange={(e) => setAllowedDomains(e.target.value)}
              placeholder="เช่น @kmitl.ac.th, @student.kmitl.ac.th"
              helperText="ปล่อยว่างหากอนุญาตทุกโดเมน (FR-AUTHZ-02)"
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button color="inherit" disabled={busy} onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? "กำลังสร้าง..." : "สร้าง Classroom"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
