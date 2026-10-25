"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import type { Assignment } from "@/features/assignments/types";
import { requestJson } from "@/shared/services/http-client";
import { previewRegeneration } from "../domain/regeneration";
import type { EvaluationCommand } from "../hooks/use-evaluation-draft";
import { RegenerationPreview } from "./regeneration-preview";

export function PublishPairsDialog({
  active,
  demo,
  command,
  onClose,
  onSuccess,
}: {
  active: Assignment;
  demo: boolean;
  command: EvaluationCommand;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [preview, setPreview] = useState<ReturnType<
    typeof previewRegeneration
  > | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setPreview(null);
      setError("");
      try {
        const result = demo
          ? previewRegeneration(active, "both")
          : (
              await requestJson<{
                preview: ReturnType<typeof previewRegeneration>;
              }>(
                `/api/assignments/${encodeURIComponent(active.id)}/pairs/preview`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ scope: "both" }),
                },
              )
            ).preview;
        if (!cancelled) setPreview(result);
      } catch (cause) {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "ตรวจสอบคู่ประเมินไม่สำเร็จ",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [active, demo, retry]);

  async function publish() {
    if (!preview || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await command({
        action: "start",
        id: active.id,
        expectedGeneration: active.pairGeneration ?? 0,
        previewToken: preview.token,
      });
      onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เปิดประเมินไม่สำเร็จ");
      setPreview(null);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Dialog
      open
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="publish-pairs-title"
    >
      <DialogTitle id="publish-pairs-title">
        ตรวจสอบคู่ก่อนเริ่มประเมิน
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">
            นักศึกษาแต่ละคนประเมินเฉพาะคู่ที่ได้รับ โดยไม่มีกลุ่มตัวเองอยู่ในคู่
            และไม่ทำคู่เดิมซ้ำในเกณฑ์เดียวกัน
          </Alert>
          <Typography variant="body2" color="text.secondary">
            ตรวจสอบ coverage และภาระงานด้านล่างก่อนยืนยัน
            ระบบจะบันทึกคู่และเปิดรับการประเมินพร้อมกัน
          </Typography>
          {loading && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center" }}
              role="status"
            >
              <CircularProgress size={20} />
              <Typography variant="body2">
                กำลังตรวจสอบความเป็นไปได้…
              </Typography>
            </Stack>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {!loading && preview && (
            <RegenerationPreview
              active={active}
              preview={preview}
              scope="both"
            />
          )}
          {!loading && !preview && (
            <Button
              onClick={() => setRetry((value) => value + 1)}
              disabled={submitting}
            >
              ตรวจสอบอีกครั้ง
            </Button>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1, flexWrap: "wrap" }}>
        <Button onClick={onClose} disabled={submitting}>
          กลับไปแก้ไข
        </Button>
        <Button
          variant="contained"
          disabled={loading || submitting || !preview}
          onClick={() => void publish()}
        >
          {submitting ? "กำลังเปิดประเมิน…" : "ยืนยันและเริ่มประเมิน"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
