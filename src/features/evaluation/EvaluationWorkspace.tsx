"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Chip } from "@heroui/react";
import { ForcedChoiceGroup } from "#/features/evaluation/ForcedChoiceGroup";

interface EvaluationItem {
  id: number;
  name: string;
  artifactUrl: string | null;
  description: string | null;
}

interface EvaluationPair {
  pairAssignmentId: number;
  left: EvaluationItem;
  right: EvaluationItem;
  choice: number | null;
  status: "draft" | "saved" | "submitted" | null;
  savedAt: string | null;
}

const AUTOSAVE_DEBOUNCE_MS = 2000; // FR-EVAL-04: debounce ≤ 2s

export function EvaluationWorkspace({ assignmentId }: { assignmentId: number }) {
  const [pairs, setPairs] = useState<EvaluationPair[] | null>(null);
  const [index, setIndex] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/assignments/${assignmentId}/pairs`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => setPairs(body.pairs))
      .catch(() => setPairs([]));
  }, [assignmentId]);

  const savePair = useCallback(
    async (pairAssignmentId: number, choice: number, status: "saved" | "submitted") => {
      const response = await fetch(`/api/assignments/${assignmentId}/comparisons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairAssignmentId, choice, status }),
      });
      if (response.ok) {
        setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      }
      return response.ok;
    },
    [assignmentId],
  );

  function handleChoice(choice: number) {
    if (!pairs) return;
    const current = pairs[index];
    setPairs((prev) =>
      prev!.map((p, i) => (i === index ? { ...p, choice } : p)),
    );

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      savePair(current.pairAssignmentId, choice, "saved");
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  async function handleSubmitAndNext() {
    if (!pairs) return;
    const current = pairs[index];
    if (current.choice == null) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const ok = await savePair(current.pairAssignmentId, current.choice, "submitted");
    if (ok) {
      setPairs((prev) => prev!.map((p, i) => (i === index ? { ...p, status: "submitted" } : p)));
      setIndex((i) => Math.min(i + 1, pairs.length - 1));
    }
  }

  if (pairs === null) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }
  if (pairs.length === 0) {
    return <p className="text-sm text-zinc-500">You have no pairs assigned for this assignment.</p>;
  }

  const answeredCount = pairs.filter((p) => p.status === "submitted").length;
  const current = pairs[index];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Evaluate</h1>
        <Chip size="sm" variant="soft">
          {answeredCount} / {pairs.length} ✓
        </Chip>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[current.left, current.right].map((item, side) => (
          <Card
            key={item.id}
            className="border border-black/10 bg-white p-4 text-center dark:border-white/12 dark:bg-zinc-950"
          >
            <Card.Header className="items-center">
              <Card.Title>{item.name}</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col items-center gap-2">
              {item.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.description}</p>
              )}
              {item.artifactUrl ? (
                <a
                  href={item.artifactUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  ดูผลงาน ↗
                </a>
              ) : (
                <p className="text-xs text-zinc-400">อาจารย์ยังไม่ได้ระบุลิงก์ผลงาน</p>
              )}
            </Card.Content>
          </Card>
        ))}
      </div>

      <ForcedChoiceGroup value={current.choice} onChange={handleChoice} />

      <div className="flex items-center justify-between">
        <p aria-live="polite" className="text-xs text-zinc-500">
          {savedAt ? `บันทึกร่างล่าสุดเมื่อ ${savedAt}` : "ยังไม่มีการบันทึก"}
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          isDisabled={current.choice == null}
          onPress={handleSubmitAndNext}
        >
          Submit & Next Pair
        </Button>
      </div>
    </div>
  );
}
