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

const choices: ComparisonChoice[] = [1, 2, 3, 4, 5, 6];

function ScaleCircle({ checked = false }: { checked?: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: "block",
        width: { xs: 38, sm: 44 },
        maxWidth: "100%",
        aspectRatio: "1",
        borderRadius: "50%",
        border: "2px solid currentColor",
        bgcolor: checked ? "currentColor" : "background.paper",
        position: "relative",
        ...(checked && {
          "&::after": {
            content: '""',
            position: "absolute",
            inset: "30%",
            borderRadius: "50%",
            bgcolor: "background.paper",
          },
        }),
      }}
    />
  );
}

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
      sx={{ p: { xs: 1.5, sm: 3.5 }, borderRadius: "12px", mb: 3 }}
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
        direction="row"
        spacing={{ xs: 1, sm: 2 }}
        sx={{
          mb: 3,
          p: { xs: 1.5, sm: 2 },
          bgcolor: "action.hover",
          borderRadius: "8px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            textAlign: "center",
            overflowWrap: "anywhere",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block" }}
          >
            ฝั่งซ้าย
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontSize: { xs: "1rem", sm: "1.25rem" } }}
          >
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
              อาจารย์ยังไม่ได้ระบุ
            </Typography>
          )}
        </Box>

        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            fontWeight: 700,
            textAlign: "center",
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          VS
        </Typography>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            textAlign: "center",
            overflowWrap: "anywhere",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block" }}
          >
            ฝั่งขวา
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontSize: { xs: "1rem", sm: "1.25rem" } }}
          >
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
              อาจารย์ยังไม่ได้ระบุ
            </Typography>
          )}
        </Box>
      </Stack>

      {/* 6-point forced choice radio group */}
      <FormControl component="fieldset" fullWidth data-testid="vote-question">
        <FormLabel component="legend" sx={{ mb: 1.5, color: "text.primary" }}>
          เลือกระดับการเปรียบเทียบ (6 ระดับ — ไม่มีตัวเลือกเท่ากัน):
        </FormLabel>
        <RadioGroup
          row
          aria-labelledby={groupLabelId}
          name={`pairwise-choice-${pairId}`}
          value={currentChoice || ""}
          onChange={(_, val) => onChoiceChange(Number(val) as ComparisonChoice)}
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 27,
              left: "8.333%",
              right: "8.333%",
              height: 2,
              bgcolor: "divider",
            },
          }}
        >
          {choices.map((choiceNum) => (
            <FormControlLabel
              key={choiceNum}
              value={choiceNum}
              disabled={busy}
              labelPlacement="bottom"
              control={
                <Radio
                  icon={<ScaleCircle />}
                  checkedIcon={<ScaleCircle checked />}
                  slotProps={{
                    input: {
                      "aria-label": `${choiceNum}. ${CHOICE_POINTS[choiceNum].label}`,
                    },
                  }}
                  sx={{
                    p: 0,
                    width: 56,
                    height: 56,
                    maxWidth: "100%",
                    color: "text.secondary",
                    "&.Mui-checked": { color: "primary.main" },
                    "&.Mui-disabled": { color: "action.disabled" },
                    "&.Mui-focusVisible": {
                      outline: "2px solid",
                      outlineColor: "primary.main",
                      outlineOffset: 2,
                    },
                  }}
                />
              }
              label={
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{ display: "block", fontWeight: 700 }}
                  >
                    {choiceNum}
                  </Typography>
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ display: "block", lineHeight: 1.5, mt: 0.5 }}
                  >
                    {CHOICE_POINTS[choiceNum].label}
                  </Typography>
                </Box>
              }
              sx={{
                m: 0,
                minWidth: 0,
                width: "100%",
                px: { xs: 0.25, sm: 1 },
                position: "relative",
                justifySelf: "center",
                justifyContent: "flex-end",
                flexDirection: "column",
                "& .MuiFormControlLabel-label": { flex: 1 },
                color:
                  currentChoice === choiceNum
                    ? "primary.main"
                    : "text.secondary",
              }}
            />
          ))}
        </RadioGroup>
      </FormControl>
    </Paper>
  );
}
