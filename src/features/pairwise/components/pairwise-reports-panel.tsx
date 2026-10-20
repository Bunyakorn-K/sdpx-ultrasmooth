"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import {
  CheckCircleOutlined,
  FileDownloadOutlined,
  WarningAmber,
} from "@mui/icons-material";
import type { Assignment } from "@/features/assignments/types";
import {
  calculateItemScores,
  calculateParticipation,
  calculateParticipationMultiplier,
} from "../domain/scoring-engine";
import { analyzeAssignmentSignals } from "../domain/quality-signals";
import type {
  Comparison,
  Criterion,
  GroupEntity,
  PairAssignment,
} from "../types";

export type PairwiseReportsPanelProps = {
  active: Assignment;
  teacher: boolean;
  exportExcel: (assignment: Assignment) => Promise<void>;
};

export function PairwiseReportsPanel({
  active,
  teacher,
  exportExcel,
}: PairwiseReportsPanelProps) {
  const [reportTab, setReportTab] = useState<number>(0);

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

  // Build pairs and comparisons from active votes
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

  const groupScores = groups.map((g) => {
    return {
      group: g,
      scores: calculateItemScores(
        g.id,
        "GROUP",
        criteria,
        pairs,
        comparisons,
        active.groupMaxScore ?? 15,
        active.scoreFloor ?? 0.6,
        active.scoreCeiling ?? 1.0,
        active.minComparisons ?? 3,
      ),
    };
  });

  const studentRows = active.students.map((student) => {
    const studentGroup = active.groups.find((g) =>
      g.members.some((m) => m.id === student.id),
    );
    const assignedCount = active.groups.length - 1; // Evaluates other groups
    const submittedCount = active.votes.filter(
      (v) => v.userId === student.id,
    ).length;
    const p = calculateParticipation(submittedCount, Math.max(1, assignedCount));
    const M = calculateParticipationMultiplier(
      p,
      active.completionThreshold ?? 0.9,
    );

    // Group score component
    const groupComponent =
      groupScores.find((gs) => gs.group.id === studentGroup?.id)?.scores
        .totalScore ?? 0;
    const individualComponent = 0; // Or from individual criteria if enabled
    const finalScore = Number(
      ((groupComponent + individualComponent) * M).toFixed(2),
    );

    return {
      student,
      groupName: studentGroup?.name ?? "ไม่มีกลุ่ม",
      submittedCount,
      assignedCount,
      p,
      M,
      groupComponent,
      finalScore,
    };
  });

  const signals = analyzeAssignmentSignals(pairs, comparisons, {
    minComparisons: active.minComparisons ?? 3,
  });

  return (
    <Stack spacing={3}>
      {/* Header & Export Toolbar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Box>
          <Typography component="h2" variant="h5" sx={{ fontWeight: 700 }}>
            รายงานและผลการประเมินเปรียบเทียบคู่
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 1 }}>
            <Chip
              size="small"
              label={
                active.status === "closed"
                  ? "ผลการประเมินสรุปแล้ว"
                  : "ชั่วคราว — อาจเปลี่ยนแปลงได้"
              }
              color={active.status === "closed" ? "default" : "warning"}
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              {active.votes.length} การส่งคำตอบ · การคำนวณตามสูตร Pure Function (§9)
            </Typography>
          </Stack>
        </Box>

        {teacher && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FileDownloadOutlined />}
            onClick={() => exportExcel(active)}
            sx={{ flexShrink: 0 }}
          >
            ส่งออก Excel
          </Button>
        )}
      </Stack>

      {/* Report Sub-Tabs */}
      <Tabs
        value={reportTab}
        onChange={(_, val) => setReportTab(val)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="รายงานผลการประเมิน"
        sx={{ borderBottom: "1px solid #e8ecea" }}
      >
        <Tab label="1. สรุปคะแนนกลุ่ม (Group Summary)" />
        <Tab label="2. สรุปคะแนนรายบุคคล (Individual Summary)" />
        <Tab label="3. ความครอบคลุมคู่ (Pair Coverage)" />
        <Tab
          label={`4. ตรวจสอบคุณภาพ (${signals.length} สัญญาณ)`}
          iconPosition="end"
          icon={
            signals.length > 0 ? (
              <WarningAmber color="warning" sx={{ fontSize: 18 }} />
            ) : undefined
          }
        />
      </Tabs>

      {/* Tab 0: Group Summary (FR-REPORT-01) */}
      {reportTab === 0 && (
        <Stack spacing={2.5}>
          {groupScores.map(({ group, scores }, idx) => (
            <Paper
              key={group.id}
              variant="outlined"
              sx={{ p: 3, borderRadius: "12px" }}
              data-testid="group-summary-card"
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {idx + 1}. {group.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    เกณฑ์การให้คะแนน: Floor {active.scoreFloor ?? 0.6} – Ceiling{" "}
                    {active.scoreCeiling ?? 1.0} · คะแนนเต็มกลุ่ม{" "}
                    {active.groupMaxScore ?? 15} คะแนน
                  </Typography>
                </Box>
                <Typography
                  variant="h5"
                  color="secondary"
                  data-testid="result-score"
                  sx={{ fontWeight: 700 }}
                >
                  {scores.totalScore.toFixed(2)}{" "}
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                  >
                    / {active.groupMaxScore ?? 15}
                  </Typography>
                </Typography>
              </Stack>

              <TableContainer>
                <Table size="small" aria-label={`เกณฑ์คะแนนกลุ่ม ${group.name}`}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "action.hover" }}>
                      <TableCell sx={{ fontWeight: 600 }}>เกณฑ์การประเมิน</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        น้ำหนัก
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Quality Index (q)
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        จำนวนคู่เปรียบเทียบ
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Score Ratio
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        คะแนนถ่วงน้ำหนัก
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>สถานะ/Flags</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scores.criterionScores.map((c) => (
                      <TableRow key={c.criterionId}>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {c.criterionName}
                        </TableCell>
                        <TableCell align="right">{c.weightPct}%</TableCell>
                        <TableCell align="right">{c.q.toFixed(3)}</TableCell>
                        <TableCell align="right">{c.comparisonCount}</TableCell>
                        <TableCell align="right">
                          {(c.scoreRatio * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {c.weightedScore.toFixed(3)}
                        </TableCell>
                        <TableCell>
                          {c.flags.length > 0 ? (
                            <Chip
                              size="small"
                              color="warning"
                              label={c.flags.join(", ")}
                            />
                          ) : (
                            <Chip
                              size="small"
                              color="success"
                              variant="outlined"
                              label="สมบูรณ์"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Tab 1: Individual Summary (FR-REPORT-02) */}
      {reportTab === 1 && (
        <Paper variant="outlined" sx={{ borderRadius: "12px", overflow: "hidden" }}>
          <TableContainer>
            <Table aria-label="สรุปคะแนนรายบุคคล">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 600 }}>ชื่อนักเรียน</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>กลุ่ม</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    ส่งการประเมิน
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    สัดส่วนประเมิน (p)
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    ตัวคูณการมีส่วนร่วม (M)
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    คะแนนกลุ่ม
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    คะแนนสุดท้าย
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studentRows.map((row) => (
                  <TableRow key={row.student.id}>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {row.student.name}
                    </TableCell>
                    <TableCell>{row.groupName}</TableCell>
                    <TableCell align="right">
                      {row.submittedCount} / {row.assignedCount}
                    </TableCell>
                    <TableCell align="right">
                      {(row.p * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={`× ${row.M.toFixed(2)}`}
                        color={row.M >= 1.0 ? "success" : "warning"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {row.groupComponent.toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "secondary.main" }}>
                      {row.finalScore.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Tab 2: Pair Coverage Report (FR-REPORT-03) */}
      {reportTab === 2 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: "12px" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            การกระจายและความครอบคลุมของคู่เปรียบเทียบ (Pair Coverage)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            รายงานความถี่ที่แต่ละคู่ได้รับการประเมินตามเกณฑ์ INV-1 ถึง INV-5
            (เป้าหมาย Coverage R = {active.targetCoverage ?? 5})
          </Typography>

          <TableContainer>
            <Table size="small" aria-label="รายงานความครอบคลุมคู่">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: 600 }}>เกณฑ์</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>คู่เปรียบเทียบ (Item A vs Item B)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    จำนวนที่ได้รับ (Coverage R)
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    เป้าหมาย R
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>สถานะ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {criteria.map((crit) => {
                  const critPairs = pairs.filter((p) => p.criterion_id === crit.id);
                  return (
                    <TableRow key={crit.id}>
                      <TableCell sx={{ fontWeight: 500 }}>{crit.name}</TableCell>
                      <TableCell>
                        {groups.map((g) => g.name).join(" vs ")}
                      </TableCell>
                      <TableCell align="right">{critPairs.length}</TableCell>
                      <TableCell align="right">{active.targetCoverage ?? 5}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={critPairs.length >= 3 ? "success" : "warning"}
                          label={
                            critPairs.length >= 3
                              ? "ครอบคลุมเพียงพอ"
                              : "ต้องการประเมินเพิ่ม"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Tab 3: Quality Report (§10 Signals, FR-REPORT-04) */}
      {reportTab === 3 && (
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            สัญญาณความสมบูรณ์และความน่าเชื่อถือ (Integrity & Quality Signals)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ระบบตรวจสอบความผิดปกติทางสถิติอัตโนมัติ (§10) เพื่อเป็นข้อมูลสนับสนุนการตัดสินใจของผู้สอน (ไม่ใช่การลงโทษอัตโนมัติ)
          </Typography>

          {signals.length === 0 ? (
            <Alert
              icon={<CheckCircleOutlined fontSize="inherit" />}
              severity="success"
              sx={{ borderRadius: "12px" }}
            >
              ไม่พบสัญญาณผิดปกติในชุดข้อมูลนี้ การประเมินมีความน่าเชื่อถือและสม่ำเสมอตามเกณฑ์มาตรฐาน
            </Alert>
          ) : (
            signals.map((sig, idx) => (
              <Paper
                key={`${sig.code}-${idx}`}
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: "12px",
                  borderColor: "warning.light",
                  bgcolor: "#fffdfa",
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                  <Chip
                    size="small"
                    color="warning"
                    label={sig.code}
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {sig.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (เป้าหมาย: {sig.targetType})
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {sig.description}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>การกระทำที่แนะนำ:</strong> {sig.suggestedAction}
                </Typography>
              </Paper>
            ))
          )}
        </Stack>
      )}
    </Stack>
  );
}
