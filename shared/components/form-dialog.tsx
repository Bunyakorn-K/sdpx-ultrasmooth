"use client";
import Close from "@mui/icons-material/Close";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import type { FormEventHandler, ReactNode } from "react";
type FormDialogProps = {
  open: boolean;
  title: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  actions: ReactNode;
};
export function FormDialog({
  open,
  title,
  busy,
  onClose,
  onSubmit,
  children,
  actions,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      fullWidth
      maxWidth="sm"
    >
      <form onSubmit={onSubmit}>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pt: 3,
          }}
        >
          {title}
          <IconButton disabled={busy} aria-label="ปิด" onClick={onClose}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <div className="form-fields">{children}</div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, flexWrap: "wrap", gap: 1 }}>
          {actions}
        </DialogActions>
      </form>
    </Dialog>
  );
}
