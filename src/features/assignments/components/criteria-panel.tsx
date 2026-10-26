"use client";

import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { EditOutlined } from "@mui/icons-material";
import type { Assignment } from "../types";
import { FeasibilityPanel } from "@/features/pairwise/components/feasibility-panel";
import { generatedCriteria } from "@/features/pairwise/domain/regeneration";

export function CriteriaPanel({
  active,
  teacher,
  setQuestionText,
  openModal,
}: {
  active: Assignment;
  teacher?: boolean;
  setQuestionText?: (text: string) => void;
  openModal?: (mode: "group" | "questions") => void;
}) {
  const isDraft = active.status === "draft";
  const allCriteria = generatedCriteria(active);
  const groupCriteria = allCriteria.filter((c) => c.side === "GROUP");
  const totalWeight = groupCriteria.reduce(
    (sum, c) => sum + (c.weight_pct || 0),
    0,
  );
  const isWeightValid = Math.abs(totalWeight - 100.0) <= 0.01;

  const handleEditQuestions = () => {
    if (!isDraft) return;
    setQuestionText?.(active.questions.join("\n"));
    openModal?.("questions");
  };

  return (
    <Stack spacing={3}>
      {/* Feasibility Calculator (§8.2, FR-PAIR-04, FR-PAIR-05) */}
      <FeasibilityPanel active={active} teacher={!!teacher} />

      <Box
        className="section-toolbar"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <div>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              เกณฑ์และคำถามการประเมิน ({active.questions.length} ข้อ)
            </Typography>
            <Chip
              size="small"
              label={
                isWeightValid
                  ? "ผลรวมน้ำหนัก 100% ครบถ้วน ✓"
                  : `ผลรวมน้ำหนัก ${totalWeight.toFixed(1)}% (ต้องเท่ากับ 100%)`
              }
              color={isWeightValid ? "success" : "error"}
              variant="outlined"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            เกณฑ์และน้ำหนักสำหรับการเปรียบเทียบคู่ (Pairwise Comparison) ตาม PRD §7.3 &
            FR-ASSIGN-02
          </Typography>
        </div>

        {teacher && isDraft && (
          <Box>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<EditOutlined />}
              onClick={handleEditQuestions}
            >
              แก้ไข / เพิ่มคำถาม
            </Button>
          </Box>
        )}
      </Box>

      {groupCriteria.map((c, idx) => (
        <Paper
          key={c.id}
          variant="outlined"
          sx={{ p: 2.5, borderRadius: "12px" }}
          data-testid="criterion-item"
        >
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                <span>{idx + 1}. </span>
                <span>{c.name}</span>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                เกณฑ์การเปรียบเทียบคู่ระดับ 6 ระดับ (1–6 Forced Choice)
              </Typography>
            </Box>
            <Chip
              label={`น้ำหนัก ${c.weight_pct.toFixed(1)}%`}
              color="primary"
              variant="outlined"
            />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
