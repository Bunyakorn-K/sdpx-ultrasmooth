"use client";

import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { EditOutlined } from "@mui/icons-material";
import type { Assignment } from "../types";
import { FeasibilityPanel } from "@/features/pairwise/components/feasibility-panel";

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
  const criteria = active.questions.map((q, i) => ({
    id: `crit-${i}`,
    name: q,
    side: "GROUP" as const,
    weight_pct: Math.round(100 / (active.questions.length || 1)),
  }));

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
          <h3>เกณฑ์และคำถามการประเมิน ({active.questions.length} ข้อ)</h3>
          <p>
            เกณฑ์และน้ำหนักสำหรับการเปรียบเทียบคู่ (Pairwise Comparison) ตาม PRD §7.3
          </p>
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

      {criteria.map((c, idx) => (
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
              label={`น้ำหนัก ${c.weight_pct}%`}
              color="primary"
              variant="outlined"
            />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
