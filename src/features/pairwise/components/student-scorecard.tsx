"use client";

import {
  Alert,
  Box,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { Assignment } from "@/features/assignments/types";
import type { User } from "@/features/auth/types";
import { appealScore } from "@/features/assignments/domain/appeals";
import {
  calculateItemScores,
  calculateParticipation,
  calculateParticipationMultiplier,
  type EvaluatorRoleMap,
} from "../domain/scoring-engine";
import type {
  Comparison,
  Criterion,
  GroupEntity,
  PairAssignment,
} from "../types";

export type StudentScorecardProps = {
  active: Assignment;
  user: User | null;
};

export function StudentScorecard({ active, user }: StudentScorecardProps) {
  const ownGroup = active.groups.find((g) =>
    g.members.some((m) => m.id === user?.id),
  );

  const criteria: Criterion[] = active.questions.map((q, idx) => ({
    id: `crit-${idx}`,
    assignment_id: active.id,
    side: "GROUP" as const,
    name: q,
    description: q,
    weight_pct: Number((100 / (active.questions.length || 1)).toFixed(2)),
    display_order: idx + 1,
  }));

  const groups: GroupEntity[] = active.groups.map((g) => ({
    id: g.id,
    classroom_id: "classroom-1",
    name: g.name,
    created_at: active.createdAt,
  }));

  // Build pairs and comparisons
  const pairs: PairAssignment[] = [];
  const comparisons: Comparison[] = [];

  active.votes.forEach((v, vIdx) => {
    criteria.forEach((crit, cIdx) => {
      const pairId = `pair-${vIdx}-${crit.id}`;
      const targetId = v.groupId || v.studentId || "";
      const otherGroup = groups.find((g) => g.id !== targetId);
      const pair: PairAssignment = {
        id: pairId,
        assignment_id: active.id,
        criterion_id: crit.id,
        side: "GROUP",
        item_a_id: targetId,
        item_b_id: otherGroup ? otherGroup.id : targetId,
        evaluator_user_id: v.userId,
        display_left_item_id: targetId,
        generation: 1,
        source: "AUTO",
        created_at: v.createdAt,
      };
      pairs.push(pair);

      const rawScore = v.scores[cIdx] ?? 3;
      const choice = Math.min(6, Math.max(1, rawScore)) as Comparison["choice"];
      comparisons.push({
        id: `comp-${pairId}`,
        pair_assignment_id: pairId,
        evaluator_user_id: v.userId,
        choice,
        status: "SUBMITTED",
        time_on_task_ms: 4500,
        saved_at: v.createdAt,
        submitted_at: v.createdAt,
      });
    });
  });

  const evaluatorRoles: EvaluatorRoleMap = active.ownerId
    ? { [active.ownerId]: "OWNER" }
    : {};
  const instructorWeight = active.instructorWeight ?? 1.0;

  const groupScores = ownGroup
    ? calculateItemScores(
        ownGroup.id,
        "GROUP",
        criteria,
        pairs,
        comparisons,
        active.groupMaxScore ?? 15,
        active.scoreFloor ?? 0.6,
        active.scoreCeiling ?? 1.0,
        active.minComparisons ?? 3,
        evaluatorRoles,
        instructorWeight,
      )
    : null;

  // Personal participation
  const assignedCount = Math.max(1, active.groups.length - 1);
  const submittedCount = active.votes.filter(
    (v) => v.userId === user?.id,
  ).length;
  const p = calculateParticipation(submittedCount, assignedCount);
  const M = calculateParticipationMultiplier(
    p,
    active.completionThreshold ?? 0.9,
  );

  const individualScores =
    user && (active.individualMaxScore ?? 0) > 0
      ? calculateItemScores(
          user.id,
          "INDIVIDUAL",
          criteria,
          pairs,
          comparisons,
          active.individualMaxScore ?? 0,
          active.scoreFloor ?? 0.6,
          active.scoreCeiling ?? 1.0,
          active.minComparisons ?? 3,
          evaluatorRoles,
          instructorWeight,
        )
      : null;

  const groupComponent = groupScores?.totalScore ?? null;
  const individualComponent = individualScores
    ? individualScores.displayScore
    : 0;
  const individualHasSufficientData = individualScores
    ? individualScores.kAnonymity.isSatisfied
    : true;
  const studentOverride = active.scoreOverrides?.find(
    (o) => o.targetType === "student" && o.targetId === user?.id,
  );
  const personalFinalScore = studentOverride
    ? studentOverride.overriddenScore
    : appealScore(
        active,
        user?.id ?? "",
        groupComponent === null || individualComponent === null
          ? null
          : Number(((groupComponent + individualComponent) * M).toFixed(2)),
      );

  return (
    <Stack spacing={3}>
      {individualScores && !individualHasSufficientData && (
        <Alert severity="warning" sx={{ borderRadius: "12px" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            คะแนนส่วนบุคคล: ยังมีข้อมูลไม่พอ (FR-ANON-02)
          </Typography>
          <Typography variant="body2">
            ระบบจะแสดงคะแนนส่วนบุคคลเมื่อมีเพื่อนในกลุ่มส่งประเมินครบอย่างน้อย{" "}
            {individualScores.kAnonymity.kMin} คน เพื่อรักษาความเป็นส่วนตัวของผู้ประเมิน
          </Typography>
        </Alert>
      )}

      {/* Header Disclaimer Alert (FR-SCORE-07) */}
      <Alert
        severity={active.status === "finalized" ? "success" : "info"}
        sx={{ borderRadius: "12px" }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {active.status === "finalized"
              ? "สิ้นสุดการประเมินแล้ว"
              : "คะแนนชั่วคราว — อาจเปลี่ยนแปลงได้จนกว่าอาจารย์จะกด Finalize"}
          </Typography>
          <Chip
            size="small"
            label="FR-REPORT-06: ความเป็นส่วนตัว"
            variant="outlined"
          />
        </Stack>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          ระบบ PairEval แสดงเฉพาะคะแนนกลุ่มและคะแนนส่วนบุคคลของคุณเท่านั้น
          จะไม่มีการเปิดเผยคะแนนของผู้ประเมินหรือกลุ่มอื่น
        </Typography>
      </Alert>

      {/* Main Scorecard Banner */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: "12px",
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary">
              คะแนนสุทธิส่วนบุคคลของคุณ (Personal Final Score)
            </Typography>
            <Typography variant="h3" color="secondary" sx={{ fontWeight: 800 }}>
              {personalFinalScore ?? "ยังไม่มีผลประเมิน"}{" "}
              <Typography
                component="span"
                variant="h6"
                color="text.secondary"
                sx={{ fontWeight: 500 }}
              >
                /{" "}
                {(active.groupMaxScore ?? 15) +
                  (active.individualMaxScore ?? 0)}
              </Typography>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {appealScore(active, user?.id ?? "", null) !== null &&
                "คะแนนรวมปรับตามผลอุทธรณ์ · คะแนนคำนวณเดิม: "}
              คำนวณจาก (คะแนนกลุ่ม {groupComponent?.toFixed(2) ?? "—"} + รายคน{" "}
              {individualComponent?.toFixed(2) ?? "—"}) × ตัวคูณการมีส่วนร่วม{" "}
              {M.toFixed(2)}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: "8px",
              bgcolor: "action.hover",
              minWidth: 220,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              กลุ่มที่สังกัด:
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {ownGroup?.name || "ยังไม่มีกลุ่ม"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              การมีส่วนร่วมประเมิน (Participation p):
            </Typography>
            <LinearProgress
              variant="determinate"
              value={p * 100}
              color={M >= 1.0 ? "secondary" : "warning"}
              sx={{ height: 6, borderRadius: 4, my: 0.5 }}
            />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              ส่งแล้ว {submittedCount}/{assignedCount} คู่ ({(p * 100).toFixed(0)}%)
              → ตัวคูณ M = {M.toFixed(2)}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        {/* Group Component Breakdown */}
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          รายละเอียดคะแนนกลุ่ม: {ownGroup?.name}
        </Typography>

        {groupScores ? (
          <TableContainer>
            <Table size="small" aria-label="รายละเอียดคะแนนกลุ่ม">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 600 }}>เกณฑ์การประเมิน</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    น้ำหนัก (%)
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Quality Index (q)
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    คะแนนที่ได้รับ
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupScores.criterionScores.map((c) => (
                  <TableRow key={c.criterionId}>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {c.criterionName}
                    </TableCell>
                    <TableCell align="right">{c.weightPct}%</TableCell>
                    <TableCell align="right">
                      {c.q?.toFixed(3) ?? "—"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {c.weightedScore?.toFixed(3) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="warning">คุณยังไม่ได้อยู่ในกลุ่มที่ได้รับการประเมิน</Alert>
        )}

        {/* FR-SCORE-11 Policy Note */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: "8px",
            bgcolor: "#f6fbf9",
            border: "1px solid #d4ece3",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <InfoOutlined color="secondary" sx={{ fontSize: 20, mt: 0.2 }} />
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: "secondary.dark" }}
              >
                นโยบายความเป็นธรรม (FR-SCORE-11 & FR-SCORE-12)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                คะแนนรวมของกลุ่มของคุณจะไม่ถูกลดทอนจากการที่เพื่อนร่วมทีมบางคนไม่ประเมิน
                ตัวคูณการมีส่วนร่วม (M)
                จะมีผลเฉพาะกับคะแนนส่วนบุคคลของผู้ที่ประเมินไม่ครบตามเกณฑ์เท่านั้น
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  );
}
