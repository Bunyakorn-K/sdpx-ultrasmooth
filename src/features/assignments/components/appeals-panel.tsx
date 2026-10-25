"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Appeal, Assignment } from "../types";
import type { User } from "@/features/auth/types";
import {
  APPEAL_WINDOW_MS,
  appealFinalizedAt,
  appealMaximum,
} from "../domain/appeals";

type Command = (input: Record<string, unknown>) => Promise<Assignment>;
const date = (value: string) => new Date(value).toLocaleString("th-TH");
export function AppealsPanel({
  active,
  user,
  command,
}: {
  active: Assignment;
  user: User | null;
  command: Command;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const owner = user?.role === "teacher" && active.ownerId === user.id;
  const student =
    user?.role === "student" && active.students.some((s) => s.id === user.id);
  if (!owner && !student) return null;
  const finalizedAt = appealFinalizedAt(active);
  const end = finalizedAt ? Date.parse(finalizedAt) + APPEAL_WINDOW_MS : NaN;
  const current = (r: Appeal) =>
    r.finalizedAt === finalizedAt &&
    r.generation === (active.pairGeneration ?? 0);
  const appeals = (active.appeals ?? []).filter(
    (r) => owner || r.studentId === user?.id,
  );
  const ownCurrent = appeals.some(current);
  const open =
    active.status === "finalized" &&
    now <= end &&
    now >= end - APPEAL_WINDOW_MS;
  async function submit() {
    setPending(true);
    setError("");
    try {
      await command({
        action: "submitAppeal",
        id: active.id,
        message,
        expectedFinalizedAt: finalizedAt,
      });
      setMessage("");
      setSuccess("ส่งคำร้องอุทธรณ์สำเร็จ");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ส่งคำร้องไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setPending(false);
    }
  }
  return (
    <Stack spacing={2}>
      <Typography variant="h6">อุทธรณ์คะแนน</Typography>
      <Alert severity="info">
        นักศึกษายื่นอุทธรณ์ได้ 1 คำร้องต่อผลคะแนนแต่ละรอบ ภายใน 7 วันหลัง Finalize
        อาจารย์ตอบกลับและยืนยันคะแนนเดิมหรือปรับคะแนนรวมเฉพาะผู้ยื่นคำร้องได้
      </Alert>
      {Number.isFinite(end) && (
        <Typography variant="body2" color="text.secondary">
          กำหนดยื่นอุทธรณ์: {date(new Date(end).toISOString())}
        </Typography>
      )}
      {student &&
        !ownCurrent &&
        (open ? (
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack
              component="form"
              spacing={2}
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <TextField
                label="เหตุผลการอุทธรณ์"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                multiline
                minRows={4}
                required
                fullWidth
                disabled={pending}
                slotProps={{ htmlInput: { maxLength: 2000 } }}
                helperText="อธิบายคะแนนที่ต้องการให้อาจารย์ตรวจสอบ (ไม่เกิน 2000 ตัวอักษร)"
              />
              <Button
                type="submit"
                variant="contained"
                disabled={pending || !message.trim()}
                sx={{ alignSelf: "flex-start" }}
              >
                {pending ? "กำลังส่งคำร้อง…" : "ยื่นอุทธรณ์คะแนน"}
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Alert severity="warning">
            {active.status !== "finalized"
              ? "เปิดรับคำร้องเมื่ออาจารย์ Finalize คะแนนแล้ว"
              : "หมดเวลายื่นอุทธรณ์แล้ว"}
          </Alert>
        ))}
      {error && (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      )}
      {!appeals.length && (
        <Typography color="text.secondary">ยังไม่มีคำร้องอุทธรณ์</Typography>
      )}
      {[...appeals].reverse().map((appeal) => (
        <Paper variant="outlined" key={appeal.id} sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={1.5}>
            <Stack
              direction="row"
              useFlexGap
              sx={{ gap: 1, flexWrap: "wrap", alignItems: "center" }}
            >
              <Typography sx={{ fontWeight: 700 }}>
                {owner
                  ? (active.students.find((s) => s.id === appeal.studentId)
                      ?.name ?? "นักศึกษา")
                  : "คำร้องของคุณ"}
              </Typography>
              <Chip
                size="small"
                color={appeal.decision ? "success" : "warning"}
                label={appeal.decision ? "พิจารณาแล้ว" : "รอพิจารณา"}
              />
              {!current(appeal) && <Chip size="small" label="ผลคะแนนรอบเก่า" />}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              ยื่นเมื่อ {date(appeal.submittedAt)}
            </Typography>
            <Typography
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {appeal.message}
            </Typography>
            {appeal.decision ? (
              <Alert severity="success">
                <Typography sx={{ fontWeight: 700 }}>
                  {appeal.decision.outcome === "override"
                    ? `ปรับคะแนนรวมเป็น ${appeal.decision.score} / ${appealMaximum(active)}`
                    : "ยืนยันคะแนนเดิม"}
                </Typography>
                <Typography
                  sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {appeal.decision.response}
                </Typography>
                <Typography variant="caption">
                  พิจารณาเมื่อ {date(appeal.decision.decidedAt)}
                </Typography>
              </Alert>
            ) : owner && current(appeal) && active.status === "finalized" ? (
              <AppealDecision
                active={active}
                appeal={appeal}
                command={command}
                onSuccess={() => setSuccess("บันทึกผลการพิจารณาสำเร็จ")}
              />
            ) : null}
          </Stack>
        </Paper>
      ))}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled">
          {success}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
function AppealDecision({
  active,
  appeal,
  command,
  onSuccess,
}: {
  active: Assignment;
  appeal: Appeal;
  command: Command;
  onSuccess: () => void;
}) {
  const [outcome, setOutcome] = useState("uphold");
  const [response, setResponse] = useState("");
  const [score, setScore] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <Stack
      component="form"
      spacing={2}
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        try {
          await command({
            action: "resolveAppeal",
            id: active.id,
            appealId: appeal.id,
            expectedFinalizedAt: appealFinalizedAt(active),
            outcome,
            response,
            ...(outcome === "override" ? { score: Number(score) } : {}),
          });
          onSuccess();
        } catch (e) {
          setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
        } finally {
          setPending(false);
        }
      }}
    >
      <TextField
        select
        label="ผลการพิจารณา"
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        disabled={pending}
      >
        <MenuItem value="uphold">ยืนยันคะแนนเดิม</MenuItem>
        <MenuItem value="override">ปรับคะแนนรวม</MenuItem>
      </TextField>
      {outcome === "override" && (
        <TextField
          label="คะแนนรวมใหม่"
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          required
          disabled={pending}
          slotProps={{
            htmlInput: { min: 0, max: appealMaximum(active), step: "any" },
          }}
          helperText={`คะแนนรวมหลังพิจารณา 0–${appealMaximum(active)} กระทบเฉพาะนักศึกษาผู้ยื่นคำร้อง`}
        />
      )}
      <TextField
        label="คำตอบและเหตุผลของอาจารย์"
        multiline
        minRows={3}
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        required
        disabled={pending}
        slotProps={{ htmlInput: { maxLength: 2000 } }}
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        type="submit"
        variant="contained"
        disabled={
          pending ||
          !response.trim() ||
          (outcome === "override" && score === "")
        }
        sx={{ alignSelf: "flex-start" }}
      >
        {pending ? "กำลังบันทึก…" : "บันทึกผลการพิจารณา"}
      </Button>
    </Stack>
  );
}
