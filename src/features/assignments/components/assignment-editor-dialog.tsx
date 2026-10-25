"use client";
import { FormDialog } from "@/shared/components/form-dialog";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState, type FormEventHandler } from "react";

function minimumDeadline() {
  // datetime-local uses the browser's timezone and minute precision.
  const nextMinute = new Date(
    Math.floor(Date.now() / 60_000) * 60_000 + 60_000,
  );
  return new Date(
    nextMinute.getTime() - nextMinute.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 16);
}

function DeadlineField() {
  const [minimum, setMinimum] = useState(minimumDeadline);
  useEffect(() => {
    const timer = setInterval(() => setMinimum(minimumDeadline()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <TextField
      name="deadline"
      label="วันและเวลาสิ้นสุด"
      type="datetime-local"
      required
      onFocus={() => setMinimum(minimumDeadline())}
      helperText="เลือกวันและเวลาที่ยังไม่ผ่าน ตามเวลาท้องถิ่นของคุณ"
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { min: minimum, step: 60 },
      }}
    />
  );
}
export type EditorMode = "create" | "group" | "questions";
type EditorProps = {
  mode: EditorMode | null;
  busy: boolean;
  error: string;
  questionText: string;
  classrooms?: Array<{ id: string; name: string; slug: string }>;
  modalContext?: { classroomId?: string; classroomName?: string } | null;
  onQuestionsChange: (value: string) => void;
  onImport: (file?: File) => Promise<void>;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};
const titles: Record<EditorMode, string> = {
  create: "สร้าง assignment ใหม่",
  group: "สร้างกลุ่มใหม่",
  questions: "คำถามสำหรับการประเมิน",
};
export function AssignmentEditorDialog({
  mode,
  busy,
  error,
  questionText,
  classrooms,
  modalContext,
  onQuestionsChange,
  onImport,
  onClose,
  onSubmit,
}: EditorProps) {
  return (
    <FormDialog
      open={!!mode}
      title={mode ? titles[mode] : ""}
      busy={busy}
      onClose={onClose}
      onSubmit={(event) => {
        const deadline = event.currentTarget.elements.namedItem("deadline");
        if (deadline instanceof HTMLInputElement) {
          // Recheck at submission if the dialog was left open or the tab slept.
          deadline.min = minimumDeadline();
          if (!event.currentTarget.reportValidity()) {
            event.preventDefault();
            return;
          }
        }
        onSubmit(event);
      }}
      actions={
        <>
          <Button color="inherit" disabled={busy} onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy
              ? "กำลังบันทึก..."
              : mode === "create"
                ? "สร้าง assignment"
                : "บันทึก"}
          </Button>
        </>
      }
    >
      {mode === "create" && (
        <>
          {modalContext?.classroomId ? (
            <>
              <input
                type="hidden"
                name="classroomId"
                value={modalContext.classroomId}
              />
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "action.hover",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  ห้องเรียน:
                </Typography>
                <Chip
                  size="small"
                  color="secondary"
                  label={modalContext.classroomName || "ห้องเรียนนี้"}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </>
          ) : classrooms && classrooms.length > 0 ? (
            <TextField
              select
              name="classroomId"
              label="ห้องเรียน (Classroom)"
              defaultValue=""
              helperText="เลือกห้องเรียนที่ต้องการมอบหมายงานนี้ (ไม่บังคับ)"
            >
              <MenuItem value="">ไม่ระบุห้องเรียน (ทั่วไป)</MenuItem>
              {classrooms.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} ({c.slug})
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            name="title"
            label="ชื่อ assignment"
            required
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          <TextField
            name="subject"
            label="วิชา / หัวข้อ"
            required
            defaultValue={modalContext?.classroomName || ""}
          />
          <TextField name="description" label="รายละเอียด" multiline rows={2} />
          <TextField
            name="artifactUrl"
            label="ลิงก์ผลงาน / เอกสารประกอบ (Artifact URL)"
            placeholder="https://..."
            helperText="ลิงก์ไปยังไฟล์งาน เอกสาร หรือโฟลเดอร์ผลงานสำหรับให้นักเรียนเปิดดูขณะประเมิน (FR-ASSIGN-01)"
          />
          <input type="hidden" name="evaluationMode" value="group" />
          <DeadlineField />

          <Accordion
            variant="outlined"
            sx={{ borderRadius: "8px !important", overflow: "hidden" }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                การตั้งค่าคะแนนและการจับคู่ Pairwise ขั้นสูง
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    name="groupMaxScore"
                    label="คะแนนเต็มกลุ่ม"
                    type="number"
                    defaultValue={15}
                    helperText="PRD default: 15 คะแนน"
                  />
                  <TextField
                    name="individualMaxScore"
                    label="คะแนนเต็มบุคคล"
                    type="number"
                    defaultValue={5}
                    helperText="PRD default: 5 คะแนน"
                  />
                  <TextField
                    name="scoreFloor"
                    label="Score Floor (F)"
                    type="number"
                    slotProps={{ htmlInput: { step: "0.05", min: 0, max: 1 } }}
                    defaultValue={0.6}
                    helperText="PRD default: 0.60 (60%)"
                  />
                  <TextField
                    name="scoreCeiling"
                    label="Score Ceiling (C)"
                    type="number"
                    slotProps={{ htmlInput: { step: "0.05", min: 0, max: 1 } }}
                    defaultValue={1.0}
                    helperText="PRD default: 1.00 (100%)"
                  />
                  <TextField
                    name="targetCoverage"
                    label="Target Coverage (R)"
                    type="number"
                    defaultValue={5}
                    helperText="จำนวนคนประเมินต่อคู่ (default: 5)"
                  />
                  <TextField
                    name="completionThreshold"
                    label="Completion Threshold"
                    type="number"
                    slotProps={{ htmlInput: { step: "0.05", min: 0, max: 1 } }}
                    defaultValue={0.9}
                    helperText="เกณฑ์มีส่วนร่วมเพื่อได้ M=1.0 (default: 90%)"
                  />
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </>
      )}
      {mode === "questions" && (
        <>
          <TextField
            label="คำถาม (1 บรรทัดต่อ 1 คำถาม)"
            multiline
            minRows={4}
            value={questionText}
            onChange={(e) => onQuestionsChange(e.target.value)}
            required
          />
          <div className="import-row">
            <Button
              component="label"
              disabled={busy}
              startIcon={<FileUploadOutlined />}
              color="secondary"
              variant="outlined"
            >
              นำเข้า Excel
              <input
                type="file"
                hidden
                accept=".xlsx"
                onChange={(e) => {
                  void onImport(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </Button>
            <span>อ่านคำถามจากคอลัมน์แรก · สูงสุด 100 ข้อ</span>
          </div>
          <Alert severity="info" icon={false}>
            การประเมินแบบ Pairwise ใช้ระบบเปรียบเทียบคู่ 6 ระดับ (Forced Choice
            — ไม่มีตัวเลือกเท่ากัน) และแก้ไขได้ก่อนเริ่มโหวต
          </Alert>
        </>
      )}
      {mode === "group" && (
        <TextField
          name="name"
          label="ชื่อกลุ่ม"
          required
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </FormDialog>
  );
}
