"use client";

import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";

interface RosterRow {
  userId: number;
  displayName: string | null;
  email: string;
  status: "PENDING" | "ACTIVE";
  lastLoginAt: string | null;
  groupName: string | null;
}

export interface RosterTableHandle {
  refresh: () => void;
}

export const RosterTable = forwardRef<RosterTableHandle, { classroomId: number }>(function RosterTable(
  { classroomId },
  ref,
) {
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    fetch(`/api/classrooms/${classroomId}/roster`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => setRoster(body.roster))
      .catch(() => setRoster([]));
  }, [classroomId]);

  useEffect(() => {
    load();
  }, [load]);

  useImperativeHandle(ref, () => ({ refresh: load }), [load]);

  const filtered = (roster ?? []).filter((row) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      row.email.toLowerCase().includes(needle) ||
      (row.displayName ?? "").toLowerCase().includes(needle) ||
      (row.groupName ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/12 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Student roster & status</h2>
        <input
          type="search"
          placeholder="search student"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-40 rounded-full border border-black/12 bg-transparent px-3 py-1 text-xs outline-none focus:border-indigo-500 dark:border-white/15"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-zinc-500 dark:border-white/12">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Group</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Last active</th>
            </tr>
          </thead>
          <tbody>
            {roster === null && (
              <tr>
                <td colSpan={4} className="py-4 text-zinc-500">
                  Loading…
                </td>
              </tr>
            )}
            {roster !== null && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-zinc-500">
                  No students yet — import a roster CSV above.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.userId} className="border-b border-black/5 last:border-0 dark:border-white/8">
                <td className="py-2 pr-4">
                  <div className="font-medium">{row.displayName ?? row.email}</div>
                  <div className="text-xs text-zinc-500">{row.email}</div>
                </td>
                <td className="py-2 pr-4">{row.groupName ?? "—"}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      row.status === "ACTIVE"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    {row.status === "ACTIVE" ? "Active" : "Pending"}
                  </span>
                </td>
                <td className="py-2 text-zinc-500">
                  {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
