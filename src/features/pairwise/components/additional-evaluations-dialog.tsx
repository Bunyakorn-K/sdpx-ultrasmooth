"use client";
import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import type { Assignment } from "@/features/assignments/types";
import type { PairAssignment } from "../types";
import { additionalCandidates } from "../domain/additional-evaluations";
import { useWorkspace } from "@/features/workspace/context/workspace-provider";

export function AdditionalEvaluationsDialog({
  active,
  pair,
  assignedCount,
  label,
  onClose,
}: {
  active: Assignment;
  pair: PairAssignment;
  assignedCount: number;
  label: string;
  onClose: () => void;
}) {
  const { evaluationCommand: execute, setToast } = useWorkspace();
  const [count, setCount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const available = additionalCandidates(active, pair).length;
  const valid =
    Number.isInteger(Number(count)) &&
    Number(count) >= 1 &&
    Number(count) <= Math.min(100, available);
  async function submit() {
    if (locked.current || !valid) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await execute({
        action: "assignAdditional",
        id: active.id,
        pairId: pair.id,
        count: Number(count),
        expectedGeneration: active.pairGeneration,
        expectedAssignedCount: assignedCount,
      });
      setToast(`มอบหมายประเมินเพิ่ม ${count} คน และสร้างแจ้งเตือนแล้ว`);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "ส่งประเมินเพิ่มไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      fullWidth
      maxWidth="sm"
      aria-labelledby="additional-evaluations-title"
    >
      <DialogTitle id="additional-evaluations-title">ส่งประเมินเพิ่ม</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <DialogContentText>{label}</DialogContentText>
          <Alert severity="info">
            ระบบจะสุ่มนักศึกษาที่มีสิทธิ์ ยังไม่เคยได้รับคู่นี้ในเกณฑ์นี้ และมี workload เหลือ
            โดยเก็บคำตอบเดิมไว้ พร้อมแจ้งเตือนเฉพาะคนที่ถูกเลือก
          </Alert>
          <DialogContentText>
            เลือกได้อีก {available} คน · ใช้กำหนดส่งเดิมของ Assignment
          </DialogContentText>
          {available === 0 ? (
            <Alert severity="warning">
              ไม่มีผู้ประเมินที่มีสิทธิ์เหลือสำหรับคู่นี้ รายบุคคลที่มอบหมายครบทุกคนแล้วจะเพิ่มไม่ได้
            </Alert>
          ) : (
            <TextField
              autoFocus
              label="จำนวนผู้ประเมินเพิ่ม (คน)"
              type="number"
              value={count}
              disabled={busy}
              onChange={(e) => setCount(e.target.value)}
              slotProps={{
                htmlInput: { min: 1, max: Math.min(100, available), step: 1 },
              }}
              helperText="จำนวนคนที่จะได้รับงานเพิ่มสำหรับคู่นี้และเกณฑ์นี้เท่านั้น"
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          color="secondary"
          disabled={busy || !valid || active.status !== "active"}
          onClick={() => void submit()}
        >
          {busy ? "กำลังมอบหมาย…" : "ยืนยันส่งประเมินเพิ่ม"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
