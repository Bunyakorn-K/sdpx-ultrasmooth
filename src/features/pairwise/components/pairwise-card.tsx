"use client";

import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowOutward } from "@mui/icons-material";
import type { ComparisonChoice } from "../types";
import { CHOICE_POINTS } from "../domain/scoring-engine";

export type PairwiseCardProps = {
  pairId: string;
  criterionName: string;
  criterionDescription?: string;
  leftItemName: string;
  leftArtifactUrl?: string;
  rightItemName: string;
  rightArtifactUrl?: string;
  currentChoice?: ComparisonChoice;
  busy?: boolean;
  onChoiceChange: (choice: ComparisonChoice) => void;
};

export function PairwiseCard({
  pairId,
  criterionName,
  criterionDescription,
  leftItemName,
  leftArtifactUrl,
  rightItemName,
  rightArtifactUrl,
  currentChoice,
  busy,
  onChoiceChange,
}: PairwiseCardProps) {
  const groupLabelId = `pairwise-label-${pairId}`;

  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: "12px", mb: 3 }}
      data-testid="pairwise-card"
    >
      <Box sx={{ mb: 2 }}>
        <Typography
          id={groupLabelId}
          component="h3"
          variant="subtitle1"
          sx={{ fontWeight: 600 }}
        >
          เกณฑ์: {criterionName}
        </Typography>
        {criterionDescription && (
          <Typography variant="body2" color="text.secondary">
            {criterionDescription}
          </Typography>
        )}
      </Box>

      {/* Two items comparison box */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          mb: 3,
          p: 2,
          bgcolor: "action.hover",
          borderRadius: "8px",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <Box sx={{ flex: 1, textAlign: { xs: "left", sm: "center" } }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            ฝั่งซ้าย
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {leftItemName}
          </Typography>
          {leftArtifactUrl ? (
            <Button
              href={leftArtifactUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              endIcon={<ArrowOutward sx={{ fontSize: 14 }} />}
              sx={{ mt: 0.5 }}
            >
              ดูผลงาน ↗
            </Button>
          ) : (
            <Typography variant="caption" color="text.disabled">
              ยังไม่มีลิงก์ผลงาน
            </Typography>
          )}
        </Box>

        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ fontWeight: 700, textAlign: "center" }}
        >
          VS
        </Typography>

        <Box sx={{ flex: 1, textAlign: { xs: "left", sm: "center" } }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            ฝั่งขวา
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {rightItemName}
          </Typography>
          {rightArtifactUrl ? (
            <Button
              href={rightArtifactUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              endIcon={<ArrowOutward sx={{ fontSize: 14 }} />}
              sx={{ mt: 0.5 }}
            >
              ดูผลงาน ↗
            </Button>
          ) : (
            <Typography variant="caption" color="text.disabled">
              ยังไม่มีลิงก์ผลงาน
            </Typography>
          )}
        </Box>
      </Stack>

      {/* 6-point forced choice radio group */}
      <FormControl component="fieldset" fullWidth data-testid="vote-question">
        <FormLabel
          component="legend"
          sx={{ mb: 1.5, color: "text.primary" }}
        >
          เลือกระดับการเปรียบเทียบ (6 ระดับ — ไม่มีตัวเลือกเท่ากัน):
        </FormLabel>
        <RadioGroup
          aria-labelledby={groupLabelId}
          name={`pairwise-choice-${pairId}`}
          value={currentChoice || ""}
          onChange={(_, val) => onChoiceChange(Number(val) as ComparisonChoice)}
        >
          <Stack spacing={1}>
            {([1, 2, 3, 4, 5, 6] as ComparisonChoice[]).map((choiceNum) => (
              <FormControlLabel
                key={choiceNum}
                value={choiceNum}
                disabled={busy}
                control={<Radio size="medium" sx={{ p: 1 }} />}
                label={
                  <Typography variant="body2">
                    <strong>{choiceNum}</strong>. {CHOICE_POINTS[choiceNum].label}
                  </Typography>
                }
                sx={{
                  m: 0,
                  p: 1,
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor:
                    currentChoice === choiceNum ? "primary.main" : "divider",
                  bgcolor:
                    currentChoice === choiceNum
                      ? "action.selected"
                      : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              />
            ))}
          </Stack>
        </RadioGroup>
      </FormControl>
    </Paper>
  );
}
