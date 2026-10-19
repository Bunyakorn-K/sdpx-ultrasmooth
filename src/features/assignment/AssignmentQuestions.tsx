"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";

interface Question { id: number; text: string }

export function AssignmentQuestions({ assignmentId, editable, onChange }: {
  assignmentId: number; editable: boolean; onChange?: () => void;
}) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/assignments/${assignmentId}/questions`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => setQuestions(body.questions))
      .catch(() => setQuestions([]));
  }, [assignmentId]);

  useEffect(load, [load]);

  async function send(method: "POST" | "DELETE", body: object) {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/assignments/${assignmentId}/questions`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setPending(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "Could not save the question.");
      return false;
    }
    load();
    onChange?.();
    return true;
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (await send("POST", { text })) setText("");
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Voting questions</h3>
      <p className="text-xs leading-5 text-slate-500">Students score every other group from 1 to 5 on each question.</p>
      {questions === null ? <p className="text-sm text-zinc-500">Loading…</p>
        : questions.length === 0 ? <p className="text-sm text-zinc-500">No questions yet.</p>
        : (
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
            {questions.map((question) => (
              <li key={question.id}>
                <span>{question.text}</span>
                {editable && (
                  <button type="button" disabled={pending} onClick={() => send("DELETE", { questionId: question.id })}
                    className="ml-2 text-xs text-red-600 underline disabled:opacity-50">Remove</button>
                )}
              </li>
            ))}
          </ol>
        )}
      {editable && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <label htmlFor="new-question" className="sr-only">New question</label>
          <input id="new-question" type="text" value={text} maxLength={300} placeholder="e.g. How clear was the presentation?"
            onChange={(e) => setText(e.target.value)}
            className="flex-1 rounded-lg border border-black/12 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-950" />
          <Button type="submit" size="sm" variant="secondary" isDisabled={pending || !text.trim()}>Add</Button>
        </form>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
