"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Assignment } from "@/features/assignments/types";
import type { ComparisonChoice, CriterionSide } from "../types";
import { evaluationRevision } from "../domain/evaluation-submission";

export type EvaluationCommand = (
  input: Record<string, unknown>,
) => Promise<Assignment>;
type Answer = {
  pairId: string;
  choice: ComparisonChoice;
  timeOnTaskMs: number;
};
type PendingAnswer = Answer & { sequence: number };

function existingAnswers(
  a: Assignment,
  userId: string,
  side: CriterionSide,
): Record<string, Answer> {
  const ids = new Set(
    a.pairs
      ?.filter((p) => p.side === side && p.evaluator_user_id === userId)
      .map((p) => p.id),
  );
  return Object.fromEntries(
    [...(a.comparisons ?? []), ...(a.evaluationDrafts ?? [])]
      .filter((c) => ids.has(c.pair_assignment_id))
      .map((c) => [
        c.pair_assignment_id,
        {
          pairId: c.pair_assignment_id,
          choice: c.choice,
          timeOnTaskMs: c.time_on_task_ms ?? 0,
        },
      ]),
  );
}

export function getOfflineDraftStorageKey(
  assignmentId: string,
  userId: string,
  side: CriterionSide,
): string {
  return `peereval_offline_draft_${assignmentId}_${userId}_${side}`;
}

export function getInitialOfflineDraft(
  key: string | null,
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? localStorage
    : null,
): Record<string, PendingAnswer> {
  if (!key || !storage) return {};
  try {
    const cached = storage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as Record<string, PendingAnswer>;
      if (
        parsed &&
        typeof parsed === "object" &&
        Object.keys(parsed).length > 0
      ) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse issues
  }
  return {};
}

export function useEvaluationDraft(
  a: Assignment,
  userId: string,
  side: CriterionSide,
  command: EvaluationCommand,
  editable: boolean,
  visible: boolean,
) {
  const storageKey =
    typeof window !== "undefined"
      ? getOfflineDraftStorageKey(a.id, userId, side)
      : null;
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pending, setPending] = useState<Record<string, PendingAnswer>>(() =>
    getInitialOfflineDraft(storageKey),
  );
  const pendingRef = useRef<Record<string, PendingAnswer>>(pending);
  const context = useRef({ a, command });
  const queue = useRef<Promise<void>>(Promise.resolve());
  const sequence = useRef(0);
  const editRevision = useRef<number | null>(null);
  const submitLock = useRef(false);
  const lastInteraction = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(submitting);
  const editableRef = useRef(editable);
  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);
  useEffect(() => {
    editableRef.current = editable;
  }, [editable]);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  useEffect(() => {
    context.current = { a, command };
  }, [a, command]);
  useEffect(() => {
    lastInteraction.current = visible ? Date.now() : null;
  }, [visible]);

  const save = useCallback(() => {
    const job = queue.current.then(async () => {
      const snapshot = { ...pendingRef.current };
      if (!Object.keys(snapshot).length) return;
      setSaving(true);
      setError("");
      try {
        const { a: current, command: execute } = context.current;
        const updated = await execute({
          action: "saveEvaluationDrafts",
          id: current.id,
          side,
          expectedGeneration: current.pairGeneration,
          expectedRevision:
            editRevision.current ?? evaluationRevision(current, userId, side),
          answers: Object.values(snapshot).map(
            ({ pairId, choice, timeOnTaskMs }) => ({
              pairId,
              choice,
              timeOnTaskMs,
            }),
          ),
        });
        context.current.a = updated;
        const next = { ...pendingRef.current };
        for (const [id, answer] of Object.entries(snapshot))
          if (next[id]?.sequence === answer.sequence) delete next[id];
        pendingRef.current = next;
        if (!Object.keys(next).length) editRevision.current = null;
        setPending(next);
        if (storageKey) {
          try {
            if (Object.keys(next).length) {
              localStorage.setItem(storageKey, JSON.stringify(next));
            } else {
              localStorage.removeItem(storageKey);
            }
          } catch {
            // Ignore storage quota
          }
        }
        setSavedAt(
          new Date().toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "บันทึกฉบับร่างไม่สำเร็จ");
      } finally {
        setSaving(false);
      }
    });
    queue.current = job.catch(() => {});
    return job;
  }, [side, userId, storageKey]);

  useEffect(() => {
    if (!editable || submitting || !Object.keys(pending).length) return;
    const timer = setTimeout(() => {
      void save();
    }, 800);
    return () => clearTimeout(timer);
  }, [pending, editable, submitting, save]);

  useEffect(() => {
    if (!Object.keys(pending).length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  const answers = { ...existingAnswers(a, userId, side), ...pending };
  function choose(pairId: string, choice: ComparisonChoice) {
    if (submitLock.current) return;
    editRevision.current ??= evaluationRevision(
      context.current.a,
      userId,
      side,
    );
    const now = Date.now();
    const time = Math.max(0, now - (lastInteraction.current ?? now));
    lastInteraction.current = now;
    const next = {
      ...pendingRef.current,
      [pairId]: {
        pairId,
        choice,
        timeOnTaskMs: (answers[pairId]?.timeOnTaskMs ?? 0) + time,
        sequence: ++sequence.current,
      },
    };
    pendingRef.current = next;
    setPending(next);
    setSubmittedAt("");
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore storage quota
      }
    }
  }

  // FR-EVAL-13: Listen for online event and auto-sync queued drafts
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      setIsOnline(true);
      if (
        editableRef.current &&
        !submittingRef.current &&
        Object.keys(pendingRef.current).length > 0
      ) {
        void save();
      }
    };
    const onOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [save]);

  async function submit() {
    if (submitLock.current) return false;
    submitLock.current = true;
    setSubmitting(true);
    setError("");
    let success = false;
    const job = queue.current.then(async () => {
      const { a: current, command: execute } = context.current;
      const snapshot = {
        ...existingAnswers(current, userId, side),
        ...pendingRef.current,
      };
      try {
        const updated = await execute({
          action: "submitEvaluation",
          id: current.id,
          side,
          expectedGeneration: current.pairGeneration,
          expectedRevision:
            editRevision.current ?? evaluationRevision(current, userId, side),
          answers: Object.values(snapshot).map(
            ({ pairId, choice, timeOnTaskMs }) => ({
              pairId,
              choice,
              timeOnTaskMs,
            }),
          ),
        });
        context.current.a = updated;
        pendingRef.current = {};
        editRevision.current = null;
        setPending({});
        if (storageKey) {
          try {
            localStorage.removeItem(storageKey);
          } catch {
            // Ignore
          }
        }
        setSubmittedAt(
          updated.evaluationSubmissions?.at(-1)?.submittedAt ??
            new Date().toISOString(),
        );
        success = true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "ส่งผลประเมินไม่สำเร็จ");
      } finally {
        submitLock.current = false;
        setSubmitting(false);
      }
    });
    queue.current = job.catch(() => {});
    await job;
    return success;
  }
  return {
    answers,
    choose,
    save,
    submit,
    saving,
    submitting,
    error,
    savedAt,
    submittedAt,
    isOnline,
    dirty: Object.keys(pending).length > 0,
  };
}
