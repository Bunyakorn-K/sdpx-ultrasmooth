"use client";

import { useState, type ReactNode } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Menu,
  MenuItem,
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
import { ExpandMore, FileDownloadOutlined } from "@mui/icons-material";
import type { Assignment } from "@/features/assignments/types";
import type { CsvReport } from "../services/csv-service";
import { generatedResult } from "../domain/generated-results";
import { generatedCriteria } from "../domain/regeneration";
import { calculateItemScores } from "../domain/scoring-engine";
import { analyzeAssignmentSignals } from "../domain/quality-signals";

function ReportTable({
  label,
  columns,
  children,
}: {
  label: string;
  columns: string[];
  children: ReactNode;
}) {
  return (
    <TableContainer
      component={Paper}
      tabIndex={0}
      role="region"
      aria-label={label}
      sx={{
        maxWidth: "100%",
        "& th": { bgcolor: "#f6f9f7", fontWeight: 700 },
        "& td, & th": { px: 2, py: 1.5 },
        "& tbody tr:last-child td": { borderBottom: 0 },
      }}
    >
      <Table size="small" aria-label={label} sx={{ minWidth: 560 }}>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c}>{c}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>{children}</TableBody>
      </Table>
    </TableContainer>
  );
}

const formatScore = (score: number | null) =>
  score === null
    ? "ยังมีข้อมูลไม่พอ"
    : score.toLocaleString("th-TH", { maximumFractionDigits: 3 });

export function GeneratedReportsPanel({
  active,
  exportExcel,
  exportCsv,
}: {
  active: Assignment;
  exportExcel: (a: Assignment) => Promise<void>;
  exportCsv: (a: Assignment, r: CsvReport) => Promise<void>;
}) {
  const [tab, setTab] = useState(0);
  const [csvAnchor, setCsvAnchor] = useState<HTMLElement | null>(null);
  const pairs = active.pairs ?? [];
  const comparisons = active.comparisons ?? [];
  const criteria = generatedCriteria(active);
  const names = new Map(
    [...active.groups, ...active.groups.flatMap((g) => g.members)].map((i) => [
      i.id,
      i.name,
    ]),
  );
  const submittedIds = new Set(
    comparisons
      .filter((c) => c.status === "SUBMITTED")
      .map((c) => c.pair_assignment_id),
  );
  const submittedCount = pairs.filter((p) => submittedIds.has(p.id)).length;
  const progress = pairs.length
    ? Math.round((submittedCount / pairs.length) * 100)
    : 0;
  const signals = analyzeAssignmentSignals(pairs, comparisons, {
    minComparisons: active.minComparisons ?? 3,
  });
  const coverage = new Map<
    string,
    {
      a: string;
      b: string;
      criterion: string;
      side: string;
      assigned: number;
      submitted: number;
    }
  >();
  for (const p of pairs) {
    const key = JSON.stringify([
      p.criterion_id,
      ...[p.item_a_id, p.item_b_id].sort(),
    ]);
    const row = coverage.get(key) ?? {
      a: p.item_a_id,
      b: p.item_b_id,
      criterion: p.criterion_id,
      side: p.side,
      assigned: 0,
      submitted: 0,
    };
    row.assigned++;
    if (submittedIds.has(p.id)) row.submitted++;
    coverage.set(key, row);
  }
  const labels = [
    "สรุปคะแนนกลุ่ม",
    "สรุปคะแนนรายบุคคล",
    "ความครอบคลุมคู่",
    "ตรวจสอบคุณภาพ",
    "ประวัติการสร้างคู่",
  ];
  const provisional = active.status !== "finalized";
  return (
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        sx={{
          gap: 2,
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "center" },
        }}
      >
        <Box>
          <Typography component="h2" variant="h5">
            ผลการประเมิน
          </Typography>
          <Stack
            direction="row"
            useFlexGap
            sx={{ gap: 1, flexWrap: "wrap", mt: 1 }}
          >
            <Chip
              size="small"
              label={`Generation ${active.pairGeneration}`}
              variant="outlined"
            />
            <Chip
              size="small"
              label={provisional ? "ผลชั่วคราว" : "ยืนยันผลแล้ว"}
              color={provisional ? "warning" : "secondary"}
              variant="outlined"
            />
          </Stack>
        </Box>
        <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<FileDownloadOutlined />}
            onClick={() => exportExcel(active)}
          >
            ส่งออก Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlined />}
            aria-haspopup="menu"
            aria-expanded={Boolean(csvAnchor)}
            aria-controls={csvAnchor ? "generated-csv-menu" : undefined}
            onClick={(e) => setCsvAnchor(e.currentTarget)}
          >
            ส่งออก CSV
          </Button>
          <Menu
            id="generated-csv-menu"
            anchorEl={csvAnchor}
            open={Boolean(csvAnchor)}
            onClose={() => setCsvAnchor(null)}
          >
            {(
              [
                ["group-summary", labels[0]],
                ["individual-summary", labels[1]],
                ["pair-coverage", labels[2]],
              ] as const
            ).map(([report, label]) => (
              <MenuItem
                key={report}
                onClick={() => {
                  setCsvAnchor(null);
                  void exportCsv(active, report);
                }}
              >
                {label}
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      </Stack>

      <Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: "#f4faf7" }}>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", gap: 2, alignItems: "center" }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700 }}>
              ความคืบหน้าการประเมิน
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ส่งแล้ว {submittedCount} / {pairs.length} งานเปรียบเทียบ
            </Typography>
          </Box>
          <Typography
            variant="h5"
            color="secondary.main"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {progress}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress}
          color="secondary"
          aria-label="ความคืบหน้าการประเมิน"
          sx={{ height: 8, borderRadius: 4, my: 2, bgcolor: "#dfede5" }}
        />
        <Typography variant="caption" color="text.secondary">
          คำนวณเฉพาะคำตอบที่ส่งแล้วในคู่ชุดปัจจุบัน ·
          ไม่นับฉบับร่างและประวัติที่ถูกแทนที่
        </Typography>
      </Paper>

      <Box sx={{ minWidth: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, value: number) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="รายงานผลการประเมิน"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          {labels.map((label, index) => (
            <Tab
              key={label}
              id={`generated-report-tab-${index}`}
              aria-controls={`generated-report-panel-${index}`}
              label={label}
            />
          ))}
        </Tabs>
        <Box
          role="tabpanel"
          id={`generated-report-panel-${tab}`}
          aria-labelledby={`generated-report-tab-${tab}`}
          sx={{ pt: 3 }}
        >
          {tab === 0 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                คะแนนเต็ม {active.groupMaxScore ?? 15} คะแนน ·
                กดแต่ละกลุ่มเพื่อดูรายละเอียดรายเกณฑ์
              </Typography>
              {active.groups.length === 0 && (
                <Alert severity="info">
                  ยังไม่มีกลุ่มสำหรับแสดงผลการประเมิน
                </Alert>
              )}
              {active.groups.map((g) => {
                const s = calculateItemScores(
                  g.id,
                  "GROUP",
                  criteria,
                  pairs,
                  comparisons,
                  active.groupMaxScore ?? 15,
                  active.scoreFloor ?? 0.6,
                  active.scoreCeiling ?? 1,
                  active.minComparisons ?? 3,
                );
                const low = s.criterionScores.some((c) => c.flags.length > 0);
                return (
                  <Accordion
                    key={g.id}
                    disableGutters
                    elevation={0}
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: "12px !important",
                      "&:before": { display: "none" },
                      overflow: "hidden",
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMore />}
                      sx={{
                        px: { xs: 2, sm: 3 },
                        "& .MuiAccordionSummary-content": { minWidth: 0 },
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        sx={{
                          width: "100%",
                          gap: 1.5,
                          justifyContent: "space-between",
                          pr: 1,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
                          >
                            {g.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            สมาชิก {g.members.length} คน
                          </Typography>
                        </Box>
                        <Stack
                          direction="row"
                          useFlexGap
                          sx={{
                            gap: 1,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          {low && (
                            <Chip
                              label="ความเชื่อมั่นต่ำ"
                              color="warning"
                              variant="outlined"
                              size="small"
                            />
                          )}
                          <Typography
                            color="secondary.main"
                            sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                          >
                            {formatScore(s.totalScore)} /{" "}
                            {active.groupMaxScore ?? 15}
                          </Typography>
                        </Stack>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: { xs: 1, sm: 3 }, pb: 3 }}>
                      <ReportTable
                        label={`รายละเอียดคะแนน ${g.name}`}
                        columns={[
                          "เกณฑ์ประเมิน",
                          "ดัชนีคุณภาพ (q)",
                          "จำนวนครั้ง",
                          "คะแนนถ่วงน้ำหนัก",
                          "สถานะ",
                        ]}
                      >
                        {s.criterionScores.map((c) => (
                          <TableRow key={c.criterionId}>
                            <TableCell>{c.criterionName}</TableCell>
                            <TableCell>{c.q}</TableCell>
                            <TableCell>{c.comparisonCount}</TableCell>
                            <TableCell>
                              {formatScore(c.weightedScore)}
                            </TableCell>
                            <TableCell>
                              {c.flags.length ? (
                                <Chip
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  label="ความเชื่อมั่นต่ำ"
                                />
                              ) : (
                                "ข้อมูลเพียงพอ"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </ReportTable>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                คะแนนรวมคำนวณร่วมกับสัดส่วนการส่งประเมินของนักศึกษาแต่ละคน
              </Typography>
              {active.groups.every((g) => !g.members.length) ? (
                <Alert severity="info">
                  ยังไม่มีนักศึกษาในกลุ่มสำหรับแสดงคะแนน
                </Alert>
              ) : (
                <ReportTable
                  label="สรุปคะแนนรายบุคคล"
                  columns={[
                    "นักศึกษา / กลุ่ม",
                    "คะแนนกลุ่ม",
                    "คะแนนรายบุคคล",
                    "คะแนนรวม",
                  ]}
                >
                  {active.groups.flatMap((g) =>
                    g.members.map((m) => {
                      const r = generatedResult(active, m.id);
                      return (
                        <TableRow key={m.id} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 600 }}>
                              {m.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {g.name}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatScore(r.groupScore)}</TableCell>
                          <TableCell>
                            {formatScore(r.individualScore)}
                          </TableCell>
                          <TableCell
                            sx={{ color: "secondary.main", fontWeight: 700 }}
                          >
                            {formatScore(r.finalScore)}
                          </TableCell>
                        </TableRow>
                      );
                    }),
                  )}
                </ReportTable>
              )}
            </Stack>
          )}

          {tab === 2 &&
            (coverage.size === 0 ? (
              <Alert severity="info">ยังไม่มีคู่ประเมินในชุดปัจจุบัน</Alert>
            ) : (
              <ReportTable
                label="ความครอบคลุมคู่"
                columns={[
                  "คู่ประเมิน",
                  "รูปแบบ",
                  "เกณฑ์ประเมิน",
                  "ส่งแล้ว / มอบหมาย",
                ]}
              >
                {[...coverage.entries()].map(([key, row]) => (
                  <TableRow key={key} hover>
                    <TableCell>
                      {names.get(row.a) ?? row.a} ↔ {names.get(row.b) ?? row.b}
                    </TableCell>
                    <TableCell>
                      {row.side === "GROUP" ? "กลุ่ม" : "รายบุคคล"}
                    </TableCell>
                    <TableCell>
                      {criteria.find((c) => c.id === row.criterion)?.name}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`${row.submitted} / ${row.assigned}`}
                        variant="outlined"
                        color={
                          row.submitted === row.assigned
                            ? "secondary"
                            : "default"
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </ReportTable>
            ))}

          {tab === 3 && (
            <Stack spacing={2}>
              <Alert severity="info">
                สัญญาณเหล่านี้ใช้ประกอบการทบทวน
                โดยไม่ลบคำตอบหรือลดคะแนนอัตโนมัติ
              </Alert>
              {signals.length === 0 ? (
                <Alert severity="success">
                  ไม่พบสัญญาณที่ต้องทบทวนในข้อมูลปัจจุบัน
                </Alert>
              ) : (
                signals.map((signal, index) => (
                  <Paper
                    key={`${signal.code}:${signal.targetId}:${index}`}
                    sx={{ p: 2.5 }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>
                      {signal.code} · {signal.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ overflowWrap: "anywhere" }}
                    >
                      {names.get(signal.targetId) ?? signal.targetId}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {signal.description}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      แนวทางทบทวน: {signal.suggestedAction}
                    </Typography>
                  </Paper>
                ))
              )}
            </Stack>
          )}

          {tab === 4 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                ประวัติการสร้างคู่ (อ่านอย่างเดียว) ·
                ไม่นำคำตอบชุดเก่ามารวมคะแนนปัจจุบัน
              </Typography>
              {!active.pairHistory?.length && (
                <Alert severity="info">ยังไม่มีประวัติการสร้างคู่ใหม่</Alert>
              )}
              {active.pairHistory?.map((h, i) => (
                <Accordion
                  key={i}
                  disableGutters
                  elevation={0}
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: "12px !important",
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        Generation {h.generation}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ overflowWrap: "anywhere" }}
                      >
                        {h.reason}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(h.changedAt).toLocaleString("th-TH")} · เก็บ{" "}
                        {h.comparisons.length} คำตอบแบบคู่ และ {h.votes.length}{" "}
                        คำตอบเดิม
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ overflowWrap: "anywhere" }}>
                    {h.comparisons.map((c) => (
                      <Typography variant="body2" key={c.id}>
                        {c.pair_assignment_id}: {c.choice}
                      </Typography>
                    ))}
                    {h.votes.map((v, j) => (
                      <Typography variant="body2" key={j}>
                        {v.groupId ?? v.studentId}: {v.scores.join(", ")}
                      </Typography>
                    ))}
                    {!h.comparisons.length && !h.votes.length && (
                      <Typography variant="body2" color="text.secondary">
                        ไม่มีคำตอบในคู่ชุดนี้
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    </Stack>
  );
}
