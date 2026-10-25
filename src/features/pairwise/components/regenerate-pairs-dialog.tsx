"use client";
import { useEffect, useState } from "react";
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
import type { Assignment, PairScope } from "@/features/assignments/types";
import { previewRegeneration } from "../domain/regeneration";
import { requestJson } from "@/shared/services/http-client";
import { RegenerationPreview } from "./regeneration-preview";

export function RegeneratePairsDialog({
  active,
  demo,
  busy,
  action,
  onClose,
}: {
  active: Assignment;
  demo: boolean;
  busy: boolean;
  action: (command: string, input?: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<PairScope>("both");
  const [target, setTarget] = useState(active.targetCoverage ?? 5);
  const [workload, setWorkload] = useState(active.maxWorkload ?? 8);
  const localDate = (date: string) => {
    const d = new Date(date);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  const [deadline, setDeadline] = useState(localDate(active.deadline));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [preview, setPreview] = useState<ReturnType<
    typeof previewRegeneration
  > | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [expectedGeneration] = useState(active.pairGeneration ?? 0);
  const changed = expectedGeneration !== (active.pairGeneration ?? 0);
  const draft = active.status === "draft";
  const unsaved =
    target !== (active.targetCoverage ?? 5) ||
    workload !== (active.maxWorkload ?? 8) ||
    deadline !== localDate(active.deadline);
  const validConfig =
    Number.isInteger(target) &&
    target >= 1 &&
    target <= 50 &&
    Number.isInteger(workload) &&
    workload >= 1 &&
    workload <= 100 &&
    new Date(deadline).getTime() > now;
  async function loadPreview() {
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      setPreview(
        demo
          ? previewRegeneration(active, scope)
          : (
              await requestJson<{
                preview: ReturnType<typeof previewRegeneration>;
              }>(
                `/api/assignments/${encodeURIComponent(active.id)}/pairs/preview`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ scope }),
                },
              )
            ).preview,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ดูตัวอย่างไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>สร้างคู่ประเมินใหม่ (Re-generate Pairs)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {changed ? (
            <Alert severity="success">
              เผยแพร่คู่ชุดใหม่แล้ว นักศึกษาที่ได้รับผลกระทบจะได้รับการแจ้งเตือนในเว็บ
            </Alert>
          ) : (
            <>
              <Alert severity="warning">
                คำตอบเดิมในส่วนที่สร้างใหม่จะถูกเก็บเป็นประวัติและไม่นำมาคำนวณ
                คะแนนที่อาจารย์ปรับเองจะถูกล้างทั้งหมด
              </Alert>
              <Typography>
                Generation ปัจจุบัน: {active.pairGeneration ?? 0} · สถานะ:{" "}
                {active.status}
              </Typography>
              <TextField
                label="เหตุผลในการสร้างคู่ใหม่"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                multiline
                minRows={2}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
                helperText="บันทึกในประวัติการตรวจสอบ เช่น เปลี่ยนสมาชิกหรือปรับเกณฑ์"
              />
              {active.status === "finalized" ? (
                <Alert severity="info">
                  งานนี้ Finalized แล้ว ต้องเปิดผลใหม่ก่อน จากนั้นจึงนำกลับเป็น Draft
                </Alert>
              ) : !draft ? (
                <Alert severity="info">
                  นำงานกลับเป็น Draft เพื่อหยุดรับคำตอบก่อน
                  จากนั้นปิดหน้าต่างนี้เพื่อแก้สมาชิกหรือเกณฑ์ได้
                </Alert>
              ) : (
                <>
                  <TextField
                    select
                    label="ส่วนที่ต้องการสร้างใหม่"
                    value={scope}
                    onChange={(e) => {
                      setScope(e.target.value as PairScope);
                      setPreview(null);
                    }}
                  >
                    <MenuItem value="both">ทั้งสองส่วน</MenuItem>
                    <MenuItem value="group">ประเมินกลุ่ม</MenuItem>
                    <MenuItem value="individual">ประเมินรายบุคคล</MenuItem>
                  </TextField>
                  <TextField
                    label="Coverage เป้าหมายต่อคู่"
                    type="number"
                    value={target}
                    onChange={(e) => {
                      setTarget(Number(e.target.value));
                      setPreview(null);
                    }}
                    helperText="จำนวนผู้ประเมินที่ต้องการต่อคู่ ระบบอาจลดลงเมื่อทำไม่ได้"
                    slotProps={{ htmlInput: { min: 1, max: 50 } }}
                  />
                  <TextField
                    label="Workload สูงสุดต่อคนต่อเกณฑ์"
                    type="number"
                    value={workload}
                    onChange={(e) => {
                      setWorkload(Number(e.target.value));
                      setPreview(null);
                    }}
                    helperText="จำกัดภาระงานกลุ่ม ส่วนรายบุคคลต้องทำครบทุกคู่ที่มีสิทธิ์"
                    slotProps={{ htmlInput: { min: 1, max: 100 } }}
                  />
                  <TextField
                    label="กำหนดส่งชุดใหม่"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => {
                      setDeadline(e.target.value);
                      setPreview(null);
                    }}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: {
                        min: localDate(
                          new Date(
                            Math.floor(now / 60000) * 60000 + 60000,
                          ).toISOString(),
                        ),
                      },
                    }}
                  />
                  {unsaved && (
                    <Button
                      variant="outlined"
                      disabled={busy || !reason.trim() || !validConfig}
                      onClick={() =>
                        action("configurePairs", {
                          reason,
                          expectedGeneration,
                          targetCoverage: target,
                          maxWorkload: workload,
                          deadline: new Date(deadline).toISOString(),
                        })
                      }
                    >
                      บันทึกการตั้งค่าก่อนดูตัวอย่าง
                    </Button>
                  )}
                  <Typography variant="body2">
                    เป้าหมาย {active.targetCoverage ?? 5} ครั้งต่อคู่ · ภาระสูงสุด{" "}
                    {active.maxWorkload ?? 8} คู่ต่อคนต่อเกณฑ์ · กำหนดส่ง{" "}
                    {new Date(active.deadline).toLocaleString("th-TH")}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={loadPreview}
                    disabled={busy || loading || unsaved || !reason.trim()}
                  >
                    ตรวจสอบและดูตัวอย่างคู่ใหม่
                  </Button>
                  {preview && (
                    <RegenerationPreview
                      active={active}
                      preview={preview}
                      scope={scope}
                    />
                  )}
                </>
              )}
              {error && <Alert severity="error">{error}</Alert>}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={busy}>
          ปิด
        </Button>
        {!changed && active.status === "finalized" && (
          <Button
            disabled={busy || !reason.trim()}
            onClick={() => action("reopen", { reason })}
          >
            เปิดผลใหม่พร้อมบันทึกเหตุผล
          </Button>
        )}
        {!changed && !draft && active.status !== "finalized" && (
          <Button
            variant="contained"
            disabled={busy || !reason.trim()}
            onClick={() =>
              action("unpublishPairs", { reason, expectedGeneration })
            }
          >
            ยืนยันนำกลับเป็น Draft
          </Button>
        )}
        {!changed && draft && (
          <Button
            variant="contained"
            disabled={busy || loading || unsaved || !preview || !reason.trim()}
            onClick={() =>
              action("regeneratePairs", {
                scope,
                reason,
                expectedGeneration,
                previewToken: preview?.token,
              })
            }
          >
            ยืนยันและเผยแพร่คู่ใหม่
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
