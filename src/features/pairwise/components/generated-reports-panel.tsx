"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Assignment } from "@/features/assignments/types";
import type { CsvReport } from "../services/csv-service";
import { generatedResult } from "../domain/generated-results";
import { generatedCriteria } from "../domain/regeneration";
import { calculateItemScores } from "../domain/scoring-engine";

export function GeneratedReportsPanel({
  active,
  exportExcel,
  exportCsv,
}: {
  active: Assignment;
  exportExcel: (a: Assignment) => Promise<void>;
  exportCsv: (a: Assignment, r: CsvReport) => Promise<void>;
}) {
  const [report, setReport] = useState<CsvReport>("group-summary");
  const pairs = active.pairs ?? [];
  const comparisons = active.comparisons ?? [];
  const criteria = generatedCriteria(active);
  const names = new Map(
    [...active.groups, ...active.groups.flatMap((g) => g.members)].map((i) => [
      i.id,
      i.name,
    ]),
  );
  const coverage = new Map<
    string,
    {
      a: string;
      b: string;
      criterion: string;
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
      assigned: 0,
      submitted: 0,
    };
    row.assigned++;
    if (
      comparisons.some(
        (c) => c.pair_assignment_id === p.id && c.status === "SUBMITTED",
      )
    )
      row.submitted++;
    coverage.set(key, row);
  }
  return (
    <Stack spacing={2}>
      <Typography variant="h5">
        ผลการประเมิน · Generation {active.pairGeneration}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button variant="outlined" onClick={() => exportExcel(active)}>
          ส่งออก Excel
        </Button>
        <TextField
          select
          size="small"
          label="รายงาน CSV"
          value={report}
          onChange={(e) => setReport(e.target.value as CsvReport)}
        >
          <MenuItem value="group-summary">สรุปคะแนนกลุ่ม</MenuItem>
          <MenuItem value="individual-summary">สรุปคะแนนรายบุคคล</MenuItem>
          <MenuItem value="pair-coverage">ความครอบคลุมคู่</MenuItem>
        </TextField>
        <Button variant="outlined" onClick={() => exportCsv(active, report)}>
          ส่งออก CSV
        </Button>
      </Stack>
      <Alert severity="info">
        คำนวณจากคู่ปัจจุบันเท่านั้น ประวัติที่ถูกแทนที่ไม่นำมารวมคะแนน · ส่งแล้ว{" "}
        {comparisons.length}/{pairs.length} งานเปรียบเทียบ
      </Alert>
      <Typography variant="h6">สรุปคะแนนกลุ่ม</Typography>
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
        return (
          <Paper variant="outlined" sx={{ p: 2 }} key={g.id}>
            <Typography>
              {g.name}: {s.totalScore}
            </Typography>
            {s.criterionScores.map((c) => (
              <Typography variant="body2" key={c.criterionId}>
                {c.criterionName}: {c.comparisonCount} comparisons ·{" "}
                {c.flags.join(", ")}
              </Typography>
            ))}
          </Paper>
        );
      })}
      <Typography variant="h6">สรุปคะแนนรายบุคคล</Typography>
      {active.groups
        .flatMap((g) => g.members)
        .map((m) => {
          const r = generatedResult(active, m.id);
          return (
            <Paper variant="outlined" sx={{ p: 2 }} key={m.id}>
              <Typography>
                {m.name}: กลุ่ม {r.groupScore} · รายบุคคล{" "}
                {r.individualScore ?? "ยังมีข้อมูลไม่พอ"} · รวม{" "}
                {r.finalScore ?? "ยังมีข้อมูลไม่พอ"}
              </Typography>
            </Paper>
          );
        })}
      <Typography variant="h6">ความครอบคลุมคู่ (Pair Coverage)</Typography>
      {[...coverage.entries()].map(([key, row]) => (
        <Paper variant="outlined" sx={{ p: 2 }} key={key}>
          <Typography>
            {names.get(row.a)} ↔ {names.get(row.b)}
          </Typography>
          <Typography variant="body2">
            {criteria.find((c) => c.id === row.criterion)?.name} · Coverage
            ที่ส่งจริง {row.submitted} / มอบหมาย {row.assigned}
          </Typography>
        </Paper>
      ))}
      <Typography variant="h6">ประวัติการสร้างคู่ (อ่านอย่างเดียว)</Typography>
      {active.pairHistory?.map((h, i) => (
        <Paper variant="outlined" sx={{ p: 2 }} key={i}>
          <Typography>
            Generation {h.generation} · {h.reason} ·{" "}
            {new Date(h.changedAt).toLocaleString("th-TH")}
          </Typography>
          <Typography variant="body2">
            เก็บ {h.comparisons.length} คำตอบแบบคู่ และ {h.votes.length}{" "}
            คำตอบเดิม
          </Typography>
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
        </Paper>
      ))}
    </Stack>
  );
}
