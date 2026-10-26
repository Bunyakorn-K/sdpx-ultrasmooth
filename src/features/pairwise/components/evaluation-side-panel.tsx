"use client";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { AccessTime, SendOutlined } from "@mui/icons-material";
import type { Assignment } from "@/features/assignments/types";
import type { CriterionSide } from "../types";
import { useDeadlineCountdown } from "@/features/assignments/hooks/use-deadline";
import {
  useEvaluationDraft,
  type EvaluationCommand,
} from "../hooks/use-evaluation-draft";
import { PairwiseCard } from "./pairwise-card";

export function EvaluationSidePanel({
  active,
  userId,
  side,
  command,
  busy,
  visible,
}: {
  active: Assignment;
  userId: string;
  side: CriterionSide;
  command: EvaluationCommand;
  busy: boolean;
  visible: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [notification, setNotification] = useState<{
    severity: "success" | "error";
    message: string;
  } | null>(null);
  const countdown = useDeadlineCountdown(active.deadline);
  const expired = countdown.expired;
  const editable = active.status === "active" && !expired;
  const draft = useEvaluationDraft(
    active,
    userId,
    side,
    command,
    editable,
    visible,
  );
  const pairs =
    active.pairs?.filter(
      (p) => p.evaluator_user_id === userId && p.side === side,
    ) ?? [];
  const answered = pairs.filter((p) => draft.answers[p.id]).length;
  const submitted = pairs.filter((p) =>
    active.comparisons?.some((c) => c.pair_assignment_id === p.id),
  ).length;
  const revisions =
    active.evaluationSubmissions?.filter(
      (s) => s.evaluatorId === userId && s.side === side,
    ) ?? [];
  const latest = revisions.at(-1);
  const unsent =
    draft.dirty ||
    pairs.some(
      (p) =>
        draft.answers[p.id]?.choice !==
        active.comparisons?.find((c) => c.pair_assignment_id === p.id)?.choice,
    );
  const lastSaved =
    draft.savedAt ||
    active.evaluationDrafts
      ?.filter((c) => pairs.some((p) => p.id === c.pair_assignment_id))
      .map((c) => c.saved_at)
      .sort()
      .at(-1);
  const name = (id: string) =>
    active.groups.find((g) => g.id === id)?.name ??
    active.groups.flatMap((g) => g.members).find((m) => m.id === id)?.name ??
    "รายการเดิม";
  const getArtifactUrl = (id: string) => {
    const group = active.groups.find((g) => g.id === id);
    return (
      (group as { artifactUrl?: string })?.artifactUrl ||
      active.artifactUrl ||
      undefined
    );
  };
  const label = side === "GROUP" ? "ประเมินผลงานกลุ่ม" : "ประเมินเพื่อนในกลุ่ม";
  const snackbar = (
    <Snackbar
      open={!!notification}
      autoHideDuration={notification?.severity === "error" ? 6000 : 4000}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      onClose={(_, reason) => {
        if (reason !== "clickaway") setNotification(null);
      }}
    >
      <Alert
        severity={notification?.severity}
        variant="filled"
        onClose={() => setNotification(null)}
        sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
      >
        {notification?.message}
      </Alert>
    </Snackbar>
  );
  if (!pairs.length)
    return <Alert severity="info">ไม่มีคู่ที่ได้รับมอบหมายในส่วนนี้</Alert>;
  return (
    <Stack spacing={2}>
      {!draft.isOnline && (
        <Alert severity="warning">
          กำลังทำงานในโหมดออฟไลน์ —
          คำตอบจะถูกบันทึกไว้ในอุปกรณ์ของคุณและซิงค์ขึ้นเซิร์ฟเวอร์อัตโนมัติเมื่ออินเทอร์เน็ตกลับมาเชื่อมต่อ
        </Alert>
      )}
      {active.status === "active" && countdown.isUrgent && (
        <Alert severity="warning" icon={<AccessTime />}>
          เหลือเวลาส่งผลประเมินอีก {countdown.formatted} (ก่อนปิดรับคำตอบ)
        </Alert>
      )}
      <Alert severity="info">
        เลือกคำตอบได้ต่อเนื่อง ระบบบันทึกฉบับร่างอัตโนมัติ แล้วกดส่งผลประเมินรวมด้านล่าง
        ฉบับร่างยังไม่นำไปคำนวณคะแนน
      </Alert>
      {!editable && (
        <Alert severity="info">
          ปิดรับคำตอบในขณะนี้ คำตอบและฉบับร่างเปิดดูได้อย่างเดียว
        </Alert>
      )}
      {!!(latest || draft.submittedAt || submitted) && (
        <Alert severity="success">
          ส่งผลประเมินแล้ว {submitted} / {pairs.length} คู่
          {latest ? ` · ครั้งที่ ${latest.revision}` : ""}
          {editable && " · แก้ไขและส่งใหม่ได้ก่อนหมดเวลา"}
        </Alert>
      )}
      {draft.error && (
        <Alert
          severity="error"
          action={
            editable && (
              <Button
                color="inherit"
                onClick={() => void draft.save()}
                disabled={draft.saving || draft.submitting}
              >
                ลองบันทึกอีกครั้ง
              </Button>
            )
          }
        >
          {draft.error} · คำตอบที่ยังไม่บันทึกยังอยู่ในหน้านี้
        </Alert>
      )}
      {[...new Set(pairs.map((p) => p.criterion_id))].map((criterionId) => {
        const items = pairs.filter((p) => p.criterion_id === criterionId);
        const count = items.filter((p) => draft.answers[p.id]).length;
        const title =
          active.questions[Number(criterionId.split("-").at(-1))] ?? "เกณฑ์";
        return (
          <Stack
            component="section"
            aria-label={`เกณฑ์ ${title}`}
            key={criterionId}
            spacing={2}
          >
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center" }}
              spacing={1}
            >
              <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                {title}
              </Typography>
              <Chip
                label={`${count} / ${items.length} คู่`}
                size="small"
                color={count === items.length ? "secondary" : "default"}
              />
            </Stack>
            {items.map((p) => {
              const left = p.display_left_item_id;
              const right = left === p.item_a_id ? p.item_b_id : p.item_a_id;
              return (
                <PairwiseCard
                  key={p.id}
                  pairId={p.id}
                  criterionName={title}
                  leftItemName={name(left)}
                  rightItemName={name(right)}
                  leftArtifactUrl={getArtifactUrl(left)}
                  rightArtifactUrl={getArtifactUrl(right)}
                  currentChoice={draft.answers[p.id]?.choice}
                  busy={busy || !editable || draft.submitting}
                  onChoiceChange={(choice) => draft.choose(p.id, choice)}
                />
              );
            })}
          </Stack>
        );
      })}
      <Paper
        variant="outlined"
        component="section"
        aria-label={`สรุป${label}`}
        sx={{
          position: "sticky",
          bottom: 12,
          zIndex: 2,
          p: 2,
          borderRadius: 3,
          boxShadow: "0 4px 24px rgba(32,65,52,0.08)",
        }}
      >
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{
              alignItems: { sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>
                ตอบแล้ว {answered} / {pairs.length} คู่
              </Typography>
              <Typography
                role="status"
                aria-live="polite"
                variant="caption"
                color="text.secondary"
              >
                {draft.saving
                  ? "กำลังบันทึกฉบับร่าง…"
                  : draft.dirty
                    ? "มีคำตอบที่ยังไม่บันทึก"
                    : lastSaved
                      ? `บันทึกแล้ว เมื่อ ${lastSaved.includes("T") ? new Date(lastSaved).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : lastSaved}`
                      : "เลือกคำตอบเพื่อบันทึกฉบับร่าง"}
                {unsent && " · ยังมีคำตอบที่ไม่ได้ส่ง"}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<SendOutlined />}
              disabled={busy || !editable || draft.submitting}
              onClick={() => setConfirm(true)}
              sx={{ flexShrink: 0 }}
            >
              {draft.submitting
                ? "กำลังส่ง…"
                : latest || submitted
                  ? "ส่งผลประเมินใหม่"
                  : "ส่งผลประเมิน"}
            </Button>
          </Stack>
          <LinearProgress
            variant="determinate"
            color="secondary"
            value={(answered / pairs.length) * 100}
            aria-label={`ความคืบหน้า${label}`}
          />
        </Stack>
      </Paper>
      {!!revisions.length && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">ประวัติการส่งผลประเมิน</Typography>
          {revisions.map((s) => (
            <Typography variant="body2" color="text.secondary" key={s.id}>
              ครั้งที่ {s.revision} ·{" "}
              {new Date(s.submittedAt).toLocaleString("th-TH")} ·{" "}
              {s.comparisons.length} / {pairs.length} คู่
              {s.id === latest?.id ? " · ใช้คำนวณคะแนน" : " · เวอร์ชันก่อนหน้า"}
            </Typography>
          ))}
        </Stack>
      )}
      <Dialog
        open={confirm}
        onClose={() => !draft.submitting && setConfirm(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>ยืนยันส่งผล{label}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ตอบแล้ว {answered} จาก {pairs.length} คู่
          </DialogContentText>
          {answered < pairs.length && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              ยังไม่ได้ตอบ {pairs.length - answered} คู่ สามารถส่งเฉพาะคำตอบที่เลือกไว้ได้
              และกลับมาทำต่อก่อนหมดเวลา
            </Alert>
          )}
          <DialogContentText sx={{ mt: 2 }}>
            ระบบใช้คำตอบที่ส่งครั้งล่าสุดคำนวณคะแนน คุณสามารถแก้ไขแล้วส่งใหม่ได้ก่อนหมดเวลา
          </DialogContentText>
          {draft.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {draft.error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(false)} disabled={draft.submitting}>
            กลับไปตรวจทาน
          </Button>
          <Button
            variant="contained"
            disabled={!editable || draft.submitting}
            onClick={async () => {
              setNotification(null);
              const success = await draft.submit();
              if (success) setConfirm(false);
              setNotification({
                severity: success ? "success" : "error",
                message: success
                  ? "ส่งผลประเมินสำเร็จ"
                  : "ส่งผลประเมินไม่สำเร็จ กรุณาตรวจสอบข้อผิดพลาดแล้วลองอีกครั้ง",
              });
            }}
          >
            ยืนยันส่งผลประเมิน
          </Button>
        </DialogActions>
        {confirm && snackbar}
      </Dialog>
      {!confirm && snackbar}
    </Stack>
  );
}
