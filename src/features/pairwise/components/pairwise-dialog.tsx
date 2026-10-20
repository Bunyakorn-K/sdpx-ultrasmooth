"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { PairwiseCard } from "./pairwise-card";
import type { ComparisonChoice } from "../types";

export type PairwiseDialogProps = {
  open: boolean;
  pairId?: string;
  criterionName?: string;
  criterionDescription?: string;
  leftItemName?: string;
  leftArtifactUrl?: string;
  rightItemName?: string;
  rightArtifactUrl?: string;
  currentChoice?: ComparisonChoice;
  busy?: boolean;
  onChoiceChange: (choice: ComparisonChoice) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function PairwiseDialog({
  open,
  pairId = "pair-dialog",
  criterionName = "ภาพรวม",
  criterionDescription,
  leftItemName = "ฝั่งซ้าย",
  leftArtifactUrl,
  rightItemName = "ฝั่งขวา",
  rightArtifactUrl,
  currentChoice,
  busy,
  onChoiceChange,
  onClose,
  onConfirm,
}: PairwiseDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>ประเมินเปรียบเทียบคู่ (Pairwise Comparison)</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <PairwiseCard
          pairId={pairId}
          criterionName={criterionName}
          criterionDescription={criterionDescription}
          leftItemName={leftItemName}
          leftArtifactUrl={leftArtifactUrl}
          rightItemName={rightItemName}
          rightArtifactUrl={rightArtifactUrl}
          currentChoice={currentChoice}
          busy={busy}
          onChoiceChange={onChoiceChange}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button disabled={busy} color="inherit" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          disabled={busy || !currentChoice}
          onClick={onConfirm}
        >
          ยืนยันส่งคะแนน
        </Button>
      </DialogActions>
    </Dialog>
  );
}
