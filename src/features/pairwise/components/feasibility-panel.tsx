"use client";

import {
  Alert,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { CheckCircleOutlined, Functions, WarningAmber } from "@mui/icons-material";
import type { Assignment } from "@/features/assignments/types";
import { solveFeasibility, type GroupInfo } from "../domain/pairing-engine";

export type FeasibilityPanelProps = {
  active: Assignment;
  teacher: boolean;
  onPublish?: () => void;
  busy?: boolean;
};

export function FeasibilityPanel({
  active,
}: FeasibilityPanelProps) {
  const S = active.students.length;
  const N = active.groups.length;
  const targetR = active.targetCoverage ?? 5;
  const maxK = active.maxWorkload ?? 8;

  const groupInfos: GroupInfo[] = active.groups.map((g) => ({
    id: g.id,
    name: g.name,
    size: g.members.length,
  }));

  const feasibility = solveFeasibility(S, groupInfos, targetR, maxK);
  const isFeasible = !feasibility.wasReduced && feasibility.feasibleR > 0;

  return (
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
          mb: 2.5,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Functions color="secondary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              การคำนวณความเป็นไปได้ของการจับคู่ (Feasibility Solver §8.2)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ตรวจสอบว่าเป้าหมาย Coverage R = {targetR} เป็นไปได้ทางคณิตศาสตร์ภายใต้ข้อจำกัดของห้องเรียนหรือไม่
            </Typography>
          </Box>
        </Stack>

        <Chip
          label={
            isFeasible
              ? "เป็นไปได้สมบูรณ์ (Feasible)"
              : "ปรับลด Coverage อัตโนมัติ"
          }
          color={isFeasible ? "success" : "warning"}
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      {/* Numerical Metrics Summary Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
          gap: 2,
          p: 2,
          borderRadius: "8px",
          bgcolor: "action.hover",
          mb: 2.5,
        }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary">
            นักเรียน / กลุ่ม (S / N)
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {S} คน / {N} กลุ่ม
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            จำนวนคู่ทั้งหมด (P = C(N, 2))
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {feasibility.totalPairs} คู่
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Coverage จริง (R)
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: isFeasible ? "text.primary" : "warning.dark" }}
          >
            {feasibility.feasibleR} <Typography component="span" variant="caption">(เป้าหมาย {targetR})</Typography>
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            ภาระงานต่อคน (k คู่)
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {feasibility.workloadK} คู่ / คน
          </Typography>
        </Box>
      </Box>

      {/* Explanatory Alert (FR-PAIR-05) */}
      {!isFeasible && (
        <Alert
          severity="warning"
          icon={<WarningAmber />}
          sx={{ borderRadius: "8px", mb: 2 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            การปรับลด Coverage เป้าหมายอัตโนมัติ (FR-PAIR-05):
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {feasibility.message ||
              `ไม่สามารถทำ Coverage R = ${targetR} ได้เนื่องจากจำนวนนักเรียนหรือข้อจำกัด workload จึงปรับลดลงมาที่ R = ${feasibility.feasibleR}`}
          </Typography>
        </Alert>
      )}

      {isFeasible && (
        <Alert
          severity="success"
          icon={<CheckCircleOutlined />}
          sx={{ borderRadius: "8px", mb: 2 }}
        >
          การจัดสรรคู่สมดุลครบถ้วน ทุกคู่จะได้รับคำตอบอย่างน้อย {feasibility.feasibleR} ครั้ง
          โดยนักศึกษาแต่ละคนประเมินเพียง {feasibility.workloadK} คู่
        </Alert>
      )}
    </Paper>
  );
}
