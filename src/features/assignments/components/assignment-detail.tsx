"use client";
import { useState } from "react";
import { AppealsPanel } from "./appeals-panel";
import { RegeneratePairsDialog } from "@/features/pairwise/components/regenerate-pairs-dialog";
import { PublishPairsDialog } from "@/features/pairwise/components/publish-pairs-dialog";
import { GeneratedEvaluationPanel } from "@/features/pairwise/components/generated-evaluation-panel";
import { statusLabels } from "@/features/assignments/constants";
import { AccessTime, ArrowBack, PlayArrow, Stop } from "@mui/icons-material";
import {
  Alert,
  Button,
  Chip,
  Stack,
  Tab,
  Tabs,
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
};
export function AssignmentDetail(props: AssignmentDetailProps) {
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
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
          <div className="detail-meta">
            <span>
              {isIndividualEvaluation(active) ? "ประเมินรายคน" : "ประเมินกลุ่ม"}
            </span>
            <span>
              <AccessTime /> {new Date(active.deadline).toLocaleString("th-TH")}
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
    </>
  );
}
