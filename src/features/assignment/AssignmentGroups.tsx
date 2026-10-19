"use client";
import { useEffect, useState, type FormEvent } from "react";

type Group = { id: number; name: string; description: string | null; artifactUrl: string | null };
export function AssignmentGroups({ assignmentId, teacher = false, open }: {
  assignmentId: number; teacher?: boolean; open: boolean;
}) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [myGroupId, setMyGroupId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const endpoint = `/api/assignments/${assignmentId}/groups`;

  async function load() {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error();
    const body = await response.json();
    setGroups(body.groups);
    setMyGroupId(body.myGroupId);
  }
  useEffect(() => { load().catch(() => setError("Could not load assignment groups.")); }, [assignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(body: unknown) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "Could not save group."); return; }
      await load();
    } catch { setError("Could not save group. Please try again."); } finally { setPending(false); }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await save({ name: form.get("name"), description: form.get("description"), artifactUrl: form.get("artifactUrl") });
  }
  async function remove(group: Group) {
    if (pending || !window.confirm(`Delete "${group.name}" and its answer? Members will need to choose another group. This cannot be undone.`)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: group.id }) });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "Could not delete the group.");
        return;
      }
      await load();
    } catch { setError("Could not delete the group. Please try again."); } finally { setPending(false); }
  }
  const fieldClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800";
  return <section className="space-y-5 rounded-2xl border border-emerald-900/10 bg-white p-5 text-slate-800">
    <div><p className="text-xs uppercase tracking-widest text-emerald-700">Assignment workspace</p>
      <h2 className="mt-2 font-serif text-2xl">{teacher ? "Groups & answers to compare" : "Choose your group"}</h2>
      <p className="mt-2 text-sm text-slate-500">{open ? "Create or choose a group before your teacher starts voting." : "Enrollment is closed. Your group is locked for voting."}</p>
    </div>
    {groups === null && !error && <p role="status">Loading groups…</p>}
    {groups?.length === 0 && <p className="text-sm">No groups yet. {open ? "Add the first one below." : "Ask your teacher for help."}</p>}
    <ul className="space-y-3">{groups?.map((group) => <li key={group.id} className="rounded-xl bg-[#f2f9f5] p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="font-medium">{group.name}</h3>
        {teacher && open && <button type="button" disabled={pending} onClick={() => remove(group)} aria-label={`Delete group ${group.name}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6" /></svg>Delete
        </button>}
        {group.id === myGroupId ? <span className="text-xs text-emerald-800">Your group</span>
          : !teacher && open && <button disabled={pending} onClick={() => save({ groupId: group.id })} className="text-sm text-emerald-800 underline">Join group</button>}
      </div>
      {group.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{group.description}</p>}
      {group.artifactUrl && <a href={group.artifactUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-emerald-800 underline">View submission</a>}
    </li>)}</ul>
    {open && <form onSubmit={create} className="space-y-3 border-t border-slate-100 pt-5">
      <h3 className="font-medium">{teacher ? "Add a group answer" : "Create a group for this assignment"}</h3>
      <label className="block text-sm">Group name<input className={fieldClass} name="name" required maxLength={100} /></label>
      <label className="block text-sm">Answer / submission description<textarea className={fieldClass} name="description" maxLength={4000} rows={3} /></label>
      <label className="block text-sm">Submission URL (optional, HTTPS)<input className={fieldClass} name="artifactUrl" type="url" maxLength={2000} /></label>
      <button disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? "Saving…" : teacher ? "Add answer" : "Create & join group"}</button>
    </form>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
