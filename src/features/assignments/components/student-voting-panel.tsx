"use client";
import { Check, HowToVoteOutlined } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import type { User } from "@/features/auth/types";
import { useDeadline } from "../hooks/use-deadline";
import type { Assignment } from "../types";
import {
  canEvaluateTarget,
  evaluationTargets,
  isIndividualEvaluation,
  targetVotes,
} from "../domain/evaluation-targets";
export function StudentVotingPanel({
  active,
  user,
  setScores,
  setVoteTarget,
  setError,
}: {
  active: Assignment;
  user: User | null;
  setScores: (scores: number[]) => void;
  setVoteTarget: (id: string) => void;
  setError: (message: string) => void;
}) {
  const expired = useDeadline(active.deadline);
  const individual = isIndividualEvaluation(active);
  const targets = evaluationTargets(active).filter((target) =>
    canEvaluateTarget(active, user?.id ?? "", target.id),
  );
  const assignedCount = targets.length;
  const submittedCount = targets.filter((target) =>
    targetVotes(active, target.id).some((vote) => vote.userId === user?.id),
  ).length;
  const p = assignedCount > 0 ? submittedCount / assignedCount : 0;
  const threshold = active.completionThreshold ?? 0.9;
  const M = p >= threshold ? 1.0 : Number((p / threshold).toFixed(4));
  return (
    <>
      <div className="section-toolbar">
        <div>
          <h3>ให้ทุกความคิดเห็นเป็นส่วนหนึ่งของการเติบโต</h3>
          <p>
            {individual
              ? "ประเมินสมาชิกแต่ละคนภายในกลุ่มของคุณ โดยไม่ประเมินตนเอง"
              : "ประเมินเปรียบเทียบผลงานของแต่ละกลุ่ม โดยไม่ประเมินกลุ่มของตนเอง"}
          </p>
          <p>
            บันทึกคะแนนแยกตามบัญชีของคุณ ส่งได้หนึ่งครั้งต่อผู้รับการประเมิน
          </p>
        </div>
      </div>
      {active.status !== "active" || expired ? (
        <Alert severity="info">
          {active.status === "draft"
            ? "รอคุณครูกดเริ่มโหวต"
            : "หมดเวลาประเมินแล้ว รอคุณครูสรุปคะแนน"}
        </Alert>
      ) : !active.groups.some((g) =>
          g.members.some((m) => m.id === user?.id),
        ) ? (
        <Alert severity="warning">
          คุณต้องอยู่ในกลุ่มจึงจะประเมินได้ กรุณาติดต่อคุณครู
        </Alert>
      ) : (
        <>
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: "12px",
              bgcolor: "background.paper",
              borderColor: M >= 1 ? "secondary.light" : "divider",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                mb: 1.5,
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  สถานะการมีส่วนร่วมของคุณ (Participation Metric)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  เกณฑ์เต็ม M = 100% เมื่อประเมินครบ ≥ {(threshold * 100).toFixed(0)}% ·
                  คะแนนกลุ่มไม่ถูกหักลดตาม M ของสมาชิก (FR-SCORE-11)
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Chip
                  label={`ความคืบหน้า p: ${(p * 100).toFixed(0)}% (${submittedCount}/${assignedCount})`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`ตัวคูณ M: ${(M * 100).toFixed(0)}%`}
                  size="small"
                  color={M >= 1 ? "secondary" : M >= 0.5 ? "warning" : "error"}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, p * 100)}
              color={M >= 1 ? "secondary" : "warning"}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Paper>

          <div className="group-grid">
          {targets.map((target) => {
            const voted = targetVotes(active, target.id).some(
              (vote) => vote.userId === user?.id,
            );
            return (
              <Paper
                variant="outlined"
                className="group-card"
                data-testid="group-card"
                key={target.id}
                sx={{ borderRadius: "12px" }}
              >
                <span className="stat-icon mint">
                  <HowToVoteOutlined />
                </span>
                <h3>{target.name}</h3>
                {individual && (
                  <p>
                    {active.groups.find((group) =>
                      group.members.some((member) => member.id === target.id),
                    )?.name || "ยังไม่มีกลุ่ม"}
                  </p>
                )}
                <p>{active.questions.length} เกณฑ์การประเมิน · เปรียบเทียบ 6 ระดับ (Pairwise)</p>
                <Button
                  variant={voted ? "outlined" : "contained"}
                  disabled={voted}
                  fullWidth
                  onClick={() => {
                    setScores(Array(active.questions.length).fill(0));
                    setVoteTarget(target.id);
                    setError("");
                  }}
                  startIcon={voted ? <Check /> : undefined}
                >
                  {voted ? "ประเมินแล้ว" : "เริ่มประเมิน"}
                </Button>
              </Paper>
            );
          })}
        </div>
      </>
      )}
    </>
  );
}
