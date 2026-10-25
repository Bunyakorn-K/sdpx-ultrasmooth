"use client";
import type { User } from "@/features/auth/types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadDemoAssignments,
  persistDemoAssignments,
} from "../data/demo-storage";
import {
  executeDemoCommand,
  listAssignments,
  sendAssignmentCommand,
  demoClassroomRoster,
} from "../services/assignment-client";
import type { Assignment } from "../types";
export function useAssignments(
  user: User | null,
  demo: boolean,
  onError: (message: string) => void,
) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const mutationEpoch = useRef(0);
  const mutationQueue = useRef<Promise<unknown>>(Promise.resolve());
  const identity = user ? `${demo ? "demo" : "account"}:${user.id}` : null;

  const refresh = useCallback(async () => {
    if (!user) return [];
    if (demo) {
      await Promise.resolve();
      const items = loadDemoAssignments().map(demoClassroomRoster);
      setAssignments(items);
      setLoadedFor(identity);
      return items;
    }
    try {
      const epoch = mutationEpoch.current;
      const items = await listAssignments();
      if (epoch === mutationEpoch.current) setAssignments(items);
      return items;
    } catch {
      onError("โหลดข้อมูลไม่สำเร็จ ระบบจะลองเชื่อมต่อใหม่");
      return [];
    } finally {
      setLoadedFor(identity);
    }
  }, [user, demo, identity, onError]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    void Promise.resolve().then(async () => {
      if (mounted) await refresh();
    });
    const timer = setInterval(() => {
      if (mounted) void refresh();
    }, 10000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [user, refresh]);
  const save = useCallback(
    (items: Assignment[]) => {
      if (demo) persistDemoAssignments(items);
      setAssignments(items);
    },
    [demo],
  );
  async function execute(input: Record<string, unknown>) {
    if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
    // Background autosaves from either side must not race each other or an older polling response.
    mutationEpoch.current++;
    const operation = mutationQueue.current.then(async () => {
      try {
        const updated = demo
          ? executeDemoCommand(user, loadDemoAssignments(), input)
          : await sendAssignmentCommand(input);
        const replace = (items: Assignment[]) =>
          items.some((item) => item.id === updated.id)
            ? items.map((item) => (item.id === updated.id ? updated : item))
            : [updated, ...items];
        if (demo) save(replace(loadDemoAssignments()));
        else setAssignments((items) => replace(items));
        return updated;
      } finally {
        mutationEpoch.current++;
      }
    });
    mutationQueue.current = operation.catch(() => {});
    return operation;
  }
  return {
    assignments,
    setAssignments,
    execute,
    refresh,
    loading: !!user && loadedFor !== identity,
  };
}
