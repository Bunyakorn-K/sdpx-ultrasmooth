"use client";
import type { User } from "@/features/auth/types";
import { useCallback, useEffect, useState } from "react";
import {
  loadDemoAssignments,
  persistDemoAssignments,
} from "../data/demo-storage";
import {
  executeDemoCommand,
  listAssignments,
  sendAssignmentCommand,
} from "../services/assignment-client";
import type { Assignment } from "../types";
export function useAssignments(
  user: User | null,
  demo: boolean,
  onError: (message: string) => void,
) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const identity = user ? `${demo ? "demo" : "account"}:${user.id}` : null;

  const refresh = useCallback(async () => {
    if (!user) return [];
    if (demo) {
      await Promise.resolve();
      const items = loadDemoAssignments();
      setAssignments(items);
      setLoadedFor(identity);
      return items;
    }
    try {
      const items = await listAssignments();
      setAssignments(items);
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
    const updated = demo
      ? executeDemoCommand(user, assignments, input)
      : await sendAssignmentCommand(input);
    const items = assignments.some((item) => item.id === updated.id)
      ? assignments.map((item) => (item.id === updated.id ? updated : item))
      : [updated, ...assignments];
    save(items);
    return updated;
  }
  return {
    assignments,
    setAssignments,
    execute,
    refresh,
    loading: !!user && loadedFor !== identity,
  };
}
