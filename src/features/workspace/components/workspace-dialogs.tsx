"use client";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { Close } from "@mui/icons-material";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AssignmentEditorDialog } from "@/features/assignments/components/assignment-editor-dialog";
import { PairwiseDialog } from "@/features/pairwise/components/pairwise-dialog";
import type { ComparisonChoice } from "@/features/pairwise/types";
import {
  evaluationTargets,
  isIndividualEvaluation,
} from "@/features/assignments/domain/evaluation-targets";
import type { WorkspaceController } from "../hooks/use-workspace-controller";
export function WorkspaceDialogs({
  controller,
}: {
  controller: WorkspaceController;
}) {
  const {
    modal,
    setModal,
    busy,
    submit,
    questionText,
    setQuestionText,
    importExcel,
    demo,
    assignments,
    error,
    voteTarget,
    setVoteTarget,
    active,
    scores,
    setScores,
    action,
  } = controller;
  const editorMode =
    modal === "create" ||
    modal === "join" ||
    modal === "group" ||
    modal === "questions"
      ? modal
      : null;
  return (
    <>
      <AssignmentEditorDialog
        mode={editorMode}
        busy={busy}
        error={error}
        classrooms={controller.classrooms}
        modalContext={controller.modalContext}
        demoCode={
          demo ? assignments.find((a) => a.status === "draft")?.code : undefined
        }
        questionText={questionText}
        onQuestionsChange={setQuestionText}
        onImport={importExcel}
        onClose={() => {
          setModal(null);
          controller.setModalContext?.(null);
        }}
        onSubmit={submit}
      />
      <PairwiseDialog
        open={!!voteTarget}
        pairId={voteTarget || undefined}
        criterionName="เกณฑ์การประเมิน"
        leftItemName={
          active
            ? evaluationTargets(active).find(
                (target) => target.id === voteTarget,
              )?.name || "ผู้รับการประเมิน"
            : "ผู้รับการประเมิน"
        }
        rightItemName="กลุ่มมาตรฐานเปรียบเทียบ"
        currentChoice={
          scores[0]
            ? (scores[0] as ComparisonChoice)
            : undefined
        }
        busy={busy}
        onChoiceChange={(choice) =>
          setScores(Array(active?.questions.length || 1).fill(choice))
        }
        onClose={() => setVoteTarget(null)}
        onConfirm={() =>
          void action("vote", {
            ...(active && isIndividualEvaluation(active)
              ? { studentId: voteTarget }
              : { groupId: voteTarget }),
            scores,
          })
        }
      />
      <Dialog
        open={modal === "login" || modal === "register"}
        onClose={() => setModal(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{modal === "register" ? "สร้างบัญชีใหม่" : "เข้าสู่ระบบ"}</span>
          <IconButton
            aria-label="close"
            onClick={() => setModal(null)}
            size="small"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <AuthForm
            mode={modal === "register" ? "register" : "login"}
            busy={busy}
            configured={controller.configured}
            error={error}
            onSubmit={submit}
            onSwitch={(target) => setModal(target)}
            onDemo={() => controller.enterDemo("teacher")}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
