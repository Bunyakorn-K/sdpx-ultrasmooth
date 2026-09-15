"use client";

import { useRef, useState } from "react";
import { Button } from "@heroui/react";

interface ImportError {
  row: number;
  message: string;
}

export function CsvImportPanel({ classroomId, onImported }: { classroomId: number; onImported: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<ImportError[] | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setPending(true);
    setErrors(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/classrooms/${classroomId}/roster/import`, {
      method: "POST",
      body: formData,
    });
    const body = await response.json().catch(() => null);
    setPending(false);

    if (!response.ok) {
      setErrors(body?.error?.details ?? [{ row: 0, message: body?.error?.message ?? "Import failed." }]);
      return;
    }

    setSuccess(`Imported ${body.importedCount} students across ${body.groups.length} groups.`);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onImported();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold">Import roster (CSV)</h2>
      <p className="text-xs text-zinc-500">
        Columns: <code>email</code>, <code>group_name</code>, <code>student_id</code> (optional),{" "}
        <code>display_name</code> (optional). Any invalid row rejects the whole file.
      </p>
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          required
          className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        <Button type="submit" size="sm" variant="secondary" isDisabled={pending}>
          {pending ? "Importing…" : "Import"}
        </Button>
      </form>
      {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}
      {errors && (
        <ul className="flex flex-col gap-1 text-sm text-red-600 dark:text-red-400">
          {errors.map((error, index) => (
            <li key={index}>
              {error.row > 0 ? `Row ${error.row}: ` : ""}
              {error.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
