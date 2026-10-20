"use client";
import { statusLabels } from "@/features/assignments/constants";
import {
  AccessTime,
  ArrowBack,
  ContentCopy,
  PlayArrow,
  Stop,
} from "@mui/icons-material";
import { Button, Chip, IconButton, Tab, Tabs } from "@mui/material";
import { GroupsPanel } from "./groups-panel";
import { CriteriaPanel } from "./criteria-panel";
import { PairwiseReportsPanel } from "@/features/pairwise/components/pairwise-reports-panel";
import { StudentScorecard } from "@/features/pairwise/components/student-scorecard";
import { StudentVotingPanel } from "./student-voting-panel";
import { isIndividualEvaluation } from "../domain/evaluation-targets";

import type { Assignment } from "../types";
import type { User } from "@/features/auth/types";
type AssignmentDetailProps = {
  active: Assignment | undefined;
  teacher: boolean;
  busy: boolean;
  tab: number;
  user: User | null;
  setSelected: (id: string | null) => void;
  action: (command: string, input?: Record<string, unknown>) => Promise<void>;
  exportExcel: (assignment: Assignment) => Promise<void>;
  setToast: (message: string) => void;
  setError: (message: string) => void;
  setTab: (tab: number) => void;
  openModal: (mode: "group" | "questions") => void;
  setQuestionText: (text: string) => void;
  setScores: (scores: number[]) => void;
  setVoteTarget: (id: string | null) => void;
};
export function AssignmentDetail(props: AssignmentDetailProps) {
  const {
    setSelected,
    active,
    teacher,
    busy,
    action,
    exportExcel,
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
          <h1>{active.title}</h1>
          <p>{active.description}</p>
          <div className="detail-meta">
            <span>
              {isIndividualEvaluation(active) ? "ประเมินรายคน" : "ประเมินกลุ่ม"}
            </span>
            <span>
              <AccessTime /> {new Date(active.deadline).toLocaleString("th-TH")}
            </span>
            <span>
              รหัส Assignment{" "}
              <b data-testid="assignment-join-code">{active.code}</b>
              <IconButton
                aria-label="คัดลอกรหัส"
                size="small"
                onClick={() =>
                  navigator.clipboard
                    .writeText(active.code)
                    .then(() => setToast("คัดลอกรหัสแล้ว"))
                    .catch(() => setError(`รหัส Assignment: ${active.code}`))
                }
              >
                <ContentCopy sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </div>
        </div>
        {teacher && (active.status === "draft" || active.status === "active") && (
          <div className="detail-actions">
            {active.status === "draft" ? (
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                disabled={busy}
                onClick={() => action("start")}
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
            )}
          </div>
        )}
      </div>
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
      {tab === 2 &&
        (teacher ? (
          <PairwiseReportsPanel
            active={active}
            teacher={teacher}
            exportExcel={exportExcel}
          />
        ) : active.status === "closed" ? (
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
