"use client";
import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
} from "@mui/material";
import { FileDownloadOutlined } from "@mui/icons-material";
import type { Assignment } from "@/features/assignments/types";
import { useWorkspace } from "@/features/workspace/context/workspace-provider";

export function RawExportButton({ active }: { active: Assignment }) {
  const { user, demo, setToast } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  if (user?.role !== "teacher" || user.id !== active.ownerId) return null;
  async function download() {
    if (locked.current || (identified && !confirmed)) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/assignments/${encodeURIComponent(active.id)}/exports/raw`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identityMode: identified ? "identified" : "pseudonymous",
            confirmIdentity: identified && confirmed,
          }),
        },
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "ส่งออกไม่สำเร็จ กรุณาลองใหม่");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download =
          response.headers
            .get("Content-Disposition")
            ?.match(/filename="([^"]+)"/)?.[1] ?? "raw-comparisons.csv";
        link.click();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setToast("ส่งออกข้อมูลดิบเรียบร้อยแล้ว");
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ส่งออกไม่สำเร็จ");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FileDownloadOutlined />}
        disabled={!active.pairs || demo}
        onClick={() => {
          setIdentified(false);
          setConfirmed(false);
          setError("");
          setOpen(true);
        }}
      >
        ส่งออกข้อมูลดิบ
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby="raw-export-title"
      >
        <DialogTitle id="raw-export-title">ส่งออกข้อมูลดิบ CSV</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              ค่าเริ่มต้นใช้รหัสนิรนามผู้ประเมินและรายการที่ถูกเปรียบเทียบ
              โดยรหัสจะเหมือนกันภายในไฟล์นี้ และเปลี่ยนเมื่อส่งออกครั้งใหม่
              ไม่นับฉบับร่างหรือคู่ชุดเก่า
            </Alert>
            <FormControlLabel
              control={
                <Checkbox
                  checked={identified}
                  disabled={busy}
                  onChange={(_, checked) => {
                    setIdentified(checked);
                    setConfirmed(false);
                  }}
                />
              }
              label="เปิดเผยตัวตนผู้ประเมิน (เฉพาะ Owner)"
            />
            {identified && (
              <>
                <Alert severity="warning">
                  ไฟล์จะมีรหัส ชื่อ และอีเมลจริงของผู้ประเมิน การส่งออกจะถูกบันทึกใน audit log
                  กรุณาจัดเก็บไฟล์อย่างเหมาะสม
                </Alert>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={confirmed}
                      disabled={busy}
                      onChange={(_, checked) => setConfirmed(checked)}
                    />
                  }
                  label="ฉันยืนยันว่าต้องการส่งออกตัวตนจริงของผู้ประเมิน"
                />
              </>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setOpen(false)}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={busy || (identified && !confirmed)}
            onClick={() => void download()}
          >
            {busy ? "กำลังส่งออก…" : "ดาวน์โหลด CSV"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
