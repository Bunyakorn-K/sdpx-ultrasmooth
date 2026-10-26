"use client";
import { useState } from "react";
import { AppealsPanel } from "./appeals-panel";
import { RegeneratePairsDialog } from "@/features/pairwise/components/regenerate-pairs-dialog";
import { PublishPairsDialog } from "@/features/pairwise/components/publish-pairs-dialog";
import { GeneratedEvaluationPanel } from "@/features/pairwise/components/generated-evaluation-panel";
import { statusLabels } from "@/features/assignments/constants";
import {
  AccessTime,
  ArrowBack,
  ContentCopy,
  EditOutlined,
  OpenInNew,
  PlayArrow,
  Stop,
  Undo,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { GroupsPanel } from "./groups-panel";
import { CriteriaPanel } from "./criteria-panel";
import { PairwiseReportsPanel } from "@/features/pairwise/components/pairwise-reports-panel";
import { StudentScorecard } from "@/features/pairwise/components/student-scorecard";
import { StudentVotingPanel } from "./student-voting-panel";
import { isIndividualEvaluation } from "../domain/evaluation-targets";

import type { Assignment } from "../types";
import type { CsvReport } from "@/features/pairwise/services/csv-service";
import type { User } from "@/features/auth/types";

type AssignmentDetailProps = {
  demo: boolean;
  active: Assignment | undefined;
  teacher: boolean;
  busy: boolean;
  tab: number;
  user: User | null;
  setSelected: (id: string | null) => void;
  action: (command: string, input?: Record<string, unknown>) => Promise<void>;
  evaluationCommand: (input: Record<string, unknown>) => Promise<Assignment>;
  exportExcel: (assignment: Assignment) => Promise<void>;
  exportCsv: (assignment: Assignment, report: CsvReport) => Promise<void>;
  setToast: (message: string) => void;
  setError: (message: string) => void;
  setTab: (tab: number) => void;
  openModal: (mode: "group" | "questions") => void;
  setQuestionText: (text: string) => void;
  setScores: (scores: number[]) => void;
  setVoteTarget: (id: string | null) => void;
  overrideScore?: (
    targetId: string,
    targetType: "student" | "group",
    score: number,
    reason: string,
  ) => Promise<void>;
  recomputeScores?: () => Promise<void>;
  cloneAssignment?: (assignment: Assignment) => Promise<void>;
  updateDeadline?: (assignment: Assignment, deadline: string) => Promise<void>;
  unpublish?: (assignment: Assignment, reason: string) => Promise<void>;
  classrooms?: Array<{ id: string; name: string; timezone?: string }>;
};
export function AssignmentDetail(props: AssignmentDetailProps) {
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [newDeadlineVal, setNewDeadlineVal] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const [deadlineSubmitting, setDeadlineSubmitting] = useState(false);

  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [unpublishReasonVal, setUnpublishReasonVal] = useState("");
  const [unpublishError, setUnpublishError] = useState("");
  const [unpublishSubmitting, setUnpublishSubmitting] = useState(false);

  const toLocalDateTimeString = (date: string | Date) => {
    const d = new Date(date);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  const {
    setSelected,
    active,
    teacher,
    busy,
    action,
    exportExcel,
    exportCsv,
    setToast,
    setError,
    tab,
    setTab,
    user,
    openModal,
    setQuestionText,
    setScores,
    setVoteTarget,
  } = props;
  if (!active) return null;
  const showAppeals =
    (active.status === "finalized" || !!active.appeals?.length) &&
    (active.ownerId === user?.id ||
      (user?.role === "student" &&
        active.students.some((s) => s.id === user.id)));
  return (
    <>
      <Button
        color="inherit"
        startIcon={<ArrowBack />}
        onClick={() => setSelected(null)}
        sx={{ mb: 2, pl: 0 }}
      >
        กลับไป assignment
      </Button>
      <div className="detail-heading">
        <div>
          <Chip
            size="small"
            label={statusLabels[active.status]}
            color={active.status === "active" ? "secondary" : "default"}
          />
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 800, mt: 2, mb: 1, overflowWrap: "anywhere" }}
          >
            {active.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 650, overflowWrap: "anywhere" }}
          >
            {active.description}
          </Typography>
          {active.artifactUrl && (
            <Box sx={{ mt: 1, mb: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<OpenInNew />}
                href={active.artifactUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textTransform: "none" }}
              >
                ดูผลงานต้นฉบับ (Artifact Link)
              </Button>
            </Box>
          )}
          <div className="detail-meta">
            <span>
              {isIndividualEvaluation(active) ? "ประเมินรายคน" : "ประเมินกลุ่ม"}
            </span>
            <span>
              <AccessTime />{" "}
              {new Date(active.deadline).toLocaleString("th-TH", {
                timeZone:
                  props.classrooms?.find((c) => c.id === active.classroomId)
                    ?.timezone || "Asia/Bangkok",
              })}
              {teacher &&
                active.status !== "finalized" &&
                props.updateDeadline && (
                  <IconButton
                    size="small"
                    aria-label="แก้ไขกำหนดส่ง"
                    onClick={() => {
                      setNewDeadlineVal(toLocalDateTimeString(active.deadline));
                      setDeadlineError("");
                      setDeadlineOpen(true);
                    }}
                    title="แก้ไขกำหนดส่ง (FR-ASSIGN-04)"
                    sx={{ ml: 0.5, p: 0.2 }}
                  >
                    <EditOutlined sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
            </span>
          </div>
        </div>
        {teacher && (
          <Stack
            className="detail-actions"
            direction="row"
            useFlexGap
            sx={{
              gap: 1.5,
              flexWrap: "wrap",
              flexShrink: 1,
              maxWidth: "100%",
              justifyContent: { xs: "flex-start", sm: "flex-end" },
            }}
          >
            {(active.status === "draft" || active.status === "active") &&
              (active.status === "draft" ? (
                <Button
                  variant="contained"
                  startIcon={<PlayArrow />}
                  disabled={busy}
                  onClick={() => {
                    if (active.pairwiseRequired && !active.pairs) {
                      if (
                        (active.groupMaxScore ?? 15) > 0 &&
                        active.groups.filter((g) => g.members.length).length < 3
                      )
                        setError(
                          "ต้องมีกลุ่มอื่นอย่างน้อย 2 กลุ่ม (รวมอย่างน้อย 3 กลุ่มที่มีสมาชิก) เพื่อประเมินแบบคู่",
                        );
                      else setPublishOpen(true);
                    } else if (active.pairs || active.pairingPaused)
                      setRegenerateOpen(true);
                    else void action("start");
                  }}
                >
                  เริ่มโหวต
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<Stop />}
                  disabled={busy}
                  onClick={() => action("stop")}
                >
                  หยุดโหวตและรวมคะแนน
                </Button>
              ))}
            {active.ownerId === user?.id && active.status === "closed" && (
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Finalize these results and notify students? The saved results will be locked.",
                    )
                  )
                    void action("finalize");
                }}
              >
                Finalize results
              </Button>
            )}
            {active.ownerId === user?.id &&
              (!active.pairwiseRequired || active.pairs) && (
                <Button
                  variant="outlined"
                  disabled={busy}
                  onClick={() => setRegenerateOpen(true)}
                >
                  สร้างคู่ประเมินใหม่ (Re-generate Pairs)
                </Button>
              )}
            {teacher &&
              (active.status === "active" || active.status === "closed") &&
              props.unpublish && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<Undo />}
                  disabled={busy}
                  onClick={() => {
                    setUnpublishReasonVal("");
                    setUnpublishError("");
                    setUnpublishOpen(true);
                  }}
                >
                  นำกลับเป็น Draft (Unpublish)
                </Button>
              )}
            {teacher && props.cloneAssignment && (
              <Button
                variant="outlined"
                startIcon={<ContentCopy />}
                disabled={busy}
                onClick={() => void props.cloneAssignment?.(active)}
              >
                คัดลอกงาน (Clone)
              </Button>
            )}
          </Stack>
        )}
      </div>
      {teacher && !active.pairwiseRequired && !active.pairs && (
        <Alert severity="info" sx={{ mb: 3 }}>
          งานนี้ใช้การประเมินรูปแบบเดิม หากต้องการเปลี่ยนเป็นประเมินแบบคู่ ให้ใช้ Re-generate
          Pairs และยืนยันการเปลี่ยนระบบ คำตอบเดิมจะถูกเก็บเป็นประวัติ
        </Alert>
      )}
      {publishOpen &&
        teacher &&
        active.ownerId === user?.id &&
        active.status === "draft" && (
          <PublishPairsDialog
            key={active.id}
            active={active}
            demo={props.demo}
            command={props.evaluationCommand}
            onClose={() => setPublishOpen(false)}
            onSuccess={() => {
              setPublishOpen(false);
              setToast("บันทึกคู่และเปิดประเมินเรียบร้อยแล้ว");
            }}
          />
        )}
      {regenerateOpen && teacher && active.ownerId === user?.id && (
        <RegeneratePairsDialog
          key={active.id}
          active={active}
          demo={props.demo}
          busy={busy}
          action={action}
          onClose={() => setRegenerateOpen(false)}
        />
      )}
      <Tabs
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="รายละเอียด assignment"
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: "1px solid #e8ecea", mb: 3 }}
      >
        <Tab label={`กลุ่ม (${active.groups.length})`} />
        <Tab label={`คำถาม (${active.questions.length})`} />
        <Tab label={teacher ? "ผลการประเมิน" : "ประเมินผลงาน"} />
        {showAppeals && <Tab label="อุทธรณ์คะแนน" />}
      </Tabs>
      {tab === 0 && (
        <GroupsPanel
          active={active}
          teacher={teacher}
          user={user}
          busy={busy}
          action={action}
          openModal={openModal}
        />
      )}
      {tab === 1 && (
        <CriteriaPanel
          active={active}
          teacher={teacher}
          setQuestionText={setQuestionText}
          openModal={openModal}
        />
      )}
      {tab === 3 && showAppeals && (
        <AppealsPanel
          key={`${active.id}:${user?.id}`}
          active={active}
          user={user}
          command={props.evaluationCommand}
        />
      )}
      {tab === 2 &&
        (teacher ? (
          <PairwiseReportsPanel
            active={active}
            teacher={teacher}
            exportExcel={exportExcel}
            exportCsv={exportCsv}
            onOverrideScore={props.overrideScore}
            onRecomputeScores={props.recomputeScores}
          />
        ) : active.pairs ? (
          <GeneratedEvaluationPanel
            key={`${active.id}:${active.pairGeneration}:${user?.id}`}
            active={active}
            user={user}
            busy={busy}
            command={props.evaluationCommand}
          />
        ) : active.status === "closed" || active.status === "finalized" ? (
          <StudentScorecard active={active} user={user} />
        ) : (
          <StudentVotingPanel
            active={active}
            user={user}
            setScores={setScores}
            setVoteTarget={setVoteTarget}
            setError={setError}
          />
        ))}

      {/* FR-ASSIGN-04: Edit Deadline Dialog */}
      <Dialog
        open={deadlineOpen}
        onClose={() => !deadlineSubmitting && setDeadlineOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>แก้ไขกำหนดส่งงาน</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            กำหนดส่งเดิม:{" "}
            {new Date(active.deadline).toLocaleString("th-TH", {
              timeZone:
                props.classrooms?.find((c) => c.id === active.classroomId)
                  ?.timezone || "Asia/Bangkok",
            })}
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            สามารถขยายเวลาได้ตลอดเวลา
            แต่การร่นเวลาเข้าทำได้เฉพาะเมื่อยังไม่ถึงกำหนดส่งเดิมเท่านั้น (FR-ASSIGN-04)
          </Alert>
          {deadlineError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deadlineError}
            </Alert>
          )}
          <TextField
            label="กำหนดส่งใหม่"
            type="datetime-local"
            fullWidth
            value={newDeadlineVal}
            onChange={(e) => setNewDeadlineVal(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                min: toLocalDateTimeString(
                  new Date(Math.floor(Date.now() / 60000) * 60000 + 60000),
                ),
              },
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeadlineOpen(false)}
            disabled={deadlineSubmitting}
            color="inherit"
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            disabled={deadlineSubmitting || !newDeadlineVal}
            onClick={async () => {
              if (!newDeadlineVal || !props.updateDeadline) return;
              const newTime = new Date(newDeadlineVal).getTime();
              const oldTime = new Date(active.deadline).getTime();
              const now = Date.now();
              if (isNaN(newTime)) {
                setDeadlineError("รูปแบบวันเวลาไม่ถูกต้อง");
                return;
              }
              if (newTime < oldTime && now >= oldTime) {
                setDeadlineError(
                  "ไม่สามารถร่นกำหนดส่งได้เนื่องจากเลยกำหนดส่งเดิมแล้ว (FR-ASSIGN-04)",
                );
                return;
              }
              if (newTime < oldTime && newTime <= now) {
                setDeadlineError("กำหนดส่งที่ร่นเข้ามาต้องเป็นเวลาในอนาคต");
                return;
              }
              setDeadlineSubmitting(true);
              setDeadlineError("");
              try {
                await props.updateDeadline(
                  active,
                  new Date(newDeadlineVal).toISOString(),
                );
                setDeadlineOpen(false);
              } catch (err: unknown) {
                setDeadlineError(
                  err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
                );
              } finally {
                setDeadlineSubmitting(false);
              }
            }}
          >
            {deadlineSubmitting ? "กำลังบันทึก..." : "บันทึกกำหนดส่ง"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FR-ASSIGN-03: Unpublish Confirmation Dialog */}
      <Dialog
        open={unpublishOpen}
        onClose={() => !unpublishSubmitting && setUnpublishOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          ยืนยันนำกลับเป็น Draft (Unpublish)
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            การนำกลับเป็น Draft จะยกเลิกคู่ประเมินและคำตอบเดิมที่นักศึกษาส่งแล้ว
            เพื่อให้สามารถแก้ไขเกณฑ์หรือรายชื่อได้ (FR-ASSIGN-03)
          </Alert>
          {unpublishError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {unpublishError}
            </Alert>
          )}
          <TextField
            label="เหตุผลในการนำกลับเป็น Draft (จำเป็น)"
            multiline
            rows={3}
            fullWidth
            value={unpublishReasonVal}
            onChange={(e) => setUnpublishReasonVal(e.target.value)}
            placeholder="เช่น ปรับปรุงเกณฑ์การประเมิน หรือเพิ่มสมาชิกในกลุ่ม"
            required
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setUnpublishOpen(false)}
            disabled={unpublishSubmitting}
            color="inherit"
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={unpublishSubmitting || !unpublishReasonVal.trim()}
            onClick={async () => {
              if (!unpublishReasonVal.trim() || !props.unpublish) return;
              setUnpublishSubmitting(true);
              setUnpublishError("");
              try {
                await props.unpublish(active, unpublishReasonVal.trim());
                setUnpublishOpen(false);
              } catch (err: unknown) {
                setUnpublishError(
                  err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
                );
              } finally {
                setUnpublishSubmitting(false);
              }
            }}
          >
            {unpublishSubmitting ? "กำลังดำเนินการ..." : "ยืนยันนำกลับเป็น Draft"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
