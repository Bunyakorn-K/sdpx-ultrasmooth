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
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Send } from "@mui/icons-material";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import { useDeadline } from "@/features/assignments/hooks/use-deadline";
import { PairwiseCard } from "./pairwise-card";
import type { ComparisonChoice } from "../types";

export type PairwiseEvaluationScreenProps = {
  active: Assignment;
  user: User | null;
  busy: boolean;
  onVote: (targetId: string, choice: number) => Promise<void>;
  onSubmitAll?: () => Promise<void>;
};

export function PairwiseEvaluationScreen({
  active,
  user,
  busy,
  onVote,
  onSubmitAll,
}: PairwiseEvaluationScreenProps) {
  const [evalTab, setEvalTab] = useState<number>(0); // 0: Group, 1: Individual
  const [answers, setAnswers] = useState<Record<string, ComparisonChoice>>({});
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const ownGroup = active.groups.find((g) =>
    g.members.some((m) => m.id === user?.id),
  );
  const ownGroupSize = ownGroup?.members.length ?? 0;

  // Candidate items to evaluate
  // FR-PAIR-02: Group eval excludes own group
  const otherGroups = active.groups.filter((g) => g.id !== ownGroup?.id);

  // FR-PAIR-03: Individual eval evaluates peers within own group excluding self
  const peersInGroup = ownGroup?.members.filter((m) => m.id !== user?.id) ?? [];

  // Generate pairing items for display
  // In demo mode: create pairs between groups
  const groupPairs = otherGroups.map((g) => ({
    id: `pair-group-${g.id}`,
    targetId: g.id,
    leftName: g.name,
    rightName: "เกณฑ์เปรียบเทียบมาตรฐาน (Benchmark)",
    leftArtifactUrl: "#",
    rightArtifactUrl: "#",
  }));

  const indivPairs = peersInGroup.map((peer) => ({
    id: `pair-peer-${peer.id}`,
    targetId: peer.id,
    leftName: peer.name,
    rightName: "ผลงานเพื่อนร่วมทีม",
    leftArtifactUrl: "#",
    rightArtifactUrl: "#",
  }));

  const activePairs = evalTab === 0 ? groupPairs : indivPairs;
  const totalItems = activePairs.length;
  const answeredCount = activePairs.filter((p) => !!answers[p.id]).length;
  const isComplete = totalItems > 0 && answeredCount === totalItems;
  const expired = useDeadline(active.deadline);

  function handleChoice(
    pairId: string,
    targetId: string,
    choice: ComparisonChoice,
  ) {
    if (expired || active.status !== "active") return;
    setAnswers((prev) => ({ ...prev, [pairId]: choice }));
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
    setLastSaved(timeStr);

    // Call vote action for persistence
    void onVote(targetId, choice);
  }

  async function handleConfirmSubmit() {
    setConfirmOpen(false);
    setSubmitted(true);
    if (onSubmitAll) {
      await onSubmitAll();
    }
  }

  return (
    <Stack spacing={3}>
      {/* Sub-tabs: Group Evaluation (FR-EVAL-01) vs Individual Evaluation (FR-EVAL-11) */}
      <Tabs
        value={evalTab}
        onChange={(_, val) => setEvalTab(val)}
        aria-label="ประเภทการประเมิน"
        sx={{ borderBottom: "1px solid #e8ecea" }}
      >
        <Tab label={`ประเมินระหว่างกลุ่ม (Group Evaluation)`} />
        <Tab
          label={`ประเมินเพื่อนในกลุ่ม (Individual Evaluation)`}
          disabled={ownGroupSize <= 2}
        />
      </Tabs>

      {/* FR-EVAL-12 / §8.3: If group size <= 2, explain why individual eval is disabled */}
      {evalTab === 1 && ownGroupSize <= 2 && (
        <Alert severity="info" sx={{ borderRadius: "12px" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            ไม่มีการประเมินรายคนสำหรับกลุ่มขนาดนี้ (FR-PAIR-12 & §8.3)
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            กลุ่มของคุณมีสมาชิก {ownGroupSize} คน ซึ่งในกลุ่มขนาด $\le 2$ คน
            ทั้งสองคนไม่สามารถเปรียบเทียบคู่แบบไม่ประเมินตนเองได้เนื่องจากไม่มีบุคคลที่สาม
          </Typography>
        </Alert>
      )}

      {/* Progress & Autosave Bar (FR-EVAL-04, FR-EVAL-07) */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: "12px",
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              ความคืบหน้าการประเมิน: {answeredCount} / {totalItems} คู่
              {isComplete && (
                <Chip
                  size="small"
                  color="success"
                  label="ครบทุกข้อ ✓"
                  sx={{ ml: 1, fontWeight: 700 }}
                />
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {lastSaved ? (
                <>บันทึกร่างอัตโนมัติแล้ว เมื่อ {lastSaved} น. (FR-EVAL-04)</>
              ) : (
                <>ระบบบันทึกร่างอัตโนมัติทุกครั้งที่เลือกคำตอบ</>
              )}
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            endIcon={<Send />}
            disabled={
              busy || expired || active.status !== "active" || totalItems === 0
            }
            onClick={() => setConfirmOpen(true)}
            sx={{ px: 3 }}
          >
            {submitted ? "ส่งคะแนนอีกครั้ง (Re-submit)" : "ยืนยันส่งคะแนน"}
          </Button>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={totalItems ? (answeredCount / totalItems) * 100 : 0}
          color={isComplete ? "secondary" : "primary"}
          sx={{ height: 8, borderRadius: 4, mt: 2 }}
        />
      </Paper>

      {/* Comparison Cards Stack (FR-EVAL-01..03, §7.5) */}
      {activePairs.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "12px" }}>
          ไม่มีรายการเปรียบเทียบที่ต้องประเมินในขณะนี้
        </Alert>
      ) : (
        activePairs.map((pair, idx) => (
          <PairwiseCard
            key={pair.id}
            pairId={pair.id}
            criterionName={
              active.questions[idx % (active.questions.length || 1)] ||
              "ภาพรวมผลงาน"
            }
            criterionDescription="เปรียบเทียบคุณภาพของผลงานทั้งสองฝั่งอย่างเป็นธรรม โดยไม่มีตัวเลือกตรงกลาง (6-point forced choice)"
            leftItemName={pair.leftName}
            leftArtifactUrl={pair.leftArtifactUrl}
            rightItemName={pair.rightName}
            rightArtifactUrl={pair.rightArtifactUrl}
            currentChoice={answers[pair.id]}
            busy={busy || expired || active.status !== "active"}
            onChoiceChange={(choice) =>
              handleChoice(pair.id, pair.targetId, choice)
            }
          />
        ))
      )}

      {/* Confirmation Dialog before Final Submit (FR-EVAL-05) */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>ยืนยันการส่งผลการประเมิน</DialogTitle>
        <DialogContent>
          {answeredCount < totalItems ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              คุณยังตอบไม่ครบ (ตอบแล้ว {answeredCount}/{totalItems} คู่ เหลืออีก{" "}
              {totalItems - answeredCount} คู่)
            </Alert>
          ) : (
            <Alert severity="success" sx={{ mb: 2 }}>
              คุณตอบครบทุกคู่เปรียบเทียบแล้ว ({answeredCount}/{totalItems})
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            คุณสามารถกลับมาแก้ไขและกดส่งใหม่ (Re-submit) ได้ตลอดก่อนถึงกำหนดส่ง
            (FR-EVAL-06)
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            กลับไปแก้ไข
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            variant="contained"
            color="primary"
          >
            ยืนยันส่งคะแนน
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
