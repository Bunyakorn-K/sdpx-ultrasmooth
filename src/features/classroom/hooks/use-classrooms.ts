"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@/features/auth/types";
import {
  loadDemoClassrooms,
  persistDemoClassrooms,
} from "../data/demo-classrooms";
import type { Classroom, CreateClassroomInput } from "../types";
import type { ParseRosterResult } from "../domain/roster-parser";
import {
  applyRosterImport,
  createClassroom as domainCreateClassroom,
  addStaffMember as domainAddStaffMember,
  removeMember as domainRemoveMember,
  archiveClassroom as domainArchiveClassroom,
} from "../domain/classroom";

export function useClassrooms(
  user: User | null,
  demo: boolean,
  setError: (msg: string) => void,
) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return [];
    if (demo) {
      await Promise.resolve();
      const items = loadDemoClassrooms();
      setClassrooms(items);
      return items;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/classrooms");
      if (!res.ok) throw new Error("ไม่สามารถโหลดรายการห้องเรียนได้");
      const data = await res.json();
      const list = data.classrooms || [];
      setClassrooms(list);
      return list;
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดในการโหลดห้องเรียน",
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, demo, setError]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    void Promise.resolve().then(async () => {
      if (mounted) await refresh();
    });
    return () => {
      mounted = false;
    };
  }, [user, refresh]);

  async function createClassroom(input: CreateClassroomInput): Promise<Classroom> {
    if (demo && user) {
      const created = domainCreateClassroom(input, user);
      const next = [created, ...loadDemoClassrooms()];
      setClassrooms(next);
      persistDemoClassrooms(next);
      return created;
    }

    const res = await fetch("/api/classrooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || errData.message || "ไม่สามารถสร้างห้องเรียนได้");
    }

    const data = await res.json();
    const created: Classroom = data.classroom;
    setClassrooms((prev) => [created, ...prev]);
    return created;
  }

  async function importRoster(classroomId: string, roster: ParseRosterResult): Promise<void> {
    const currentList = demo ? loadDemoClassrooms() : classrooms;
    const target = currentList.find((c) => c.id === classroomId);
    if (!target) throw new Error("ไม่พบห้องเรียน");

    if (demo) {
      const { classroom: updated } = applyRosterImport(target, roster);
      const next = currentList.map((c) => (c.id === classroomId ? updated : c));
      setClassrooms(next);
      persistDemoClassrooms(next);
      return;
    }

    // Convert roster to CSV string to send to server atomic endpoint
    const header = "email,group_name,student_id,display_name\n";
    const rows = roster.members
      .map(
        (m) =>
          `"${m.email}","${m.group_name}","${m.student_id || ""}","${m.display_name}"`,
      )
      .join("\n");
    const csvText = header + rows;

    const res = await fetch(`/api/classrooms/${encodeURIComponent(classroomId)}/roster/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || errData.message || "ไม่สามารถนำเข้ารายชื่อได้");
    }

    const data = await res.json();
    setClassrooms((prev) =>
      prev.map((c) => (c.id === classroomId ? data.classroom : c)),
    );
  }

  async function addStaff(
    classroomId: string,
    input: { email: string; name: string; role: "CO_TEACHER" | "TA" },
  ): Promise<void> {
    const currentList = demo ? loadDemoClassrooms() : classrooms;
    const target = currentList.find((c) => c.id === classroomId);
    if (!target) throw new Error("ไม่พบห้องเรียน");

    if (demo && user) {
      const updated = domainAddStaffMember(target, input, user);
      const next = currentList.map((c) => (c.id === classroomId ? updated : c));
      setClassrooms(next);
      persistDemoClassrooms(next);
      return;
    }

    const res = await fetch(`/api/classrooms/${encodeURIComponent(classroomId)}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || errData.message || "ไม่สามารถเพิ่มผู้สอนได้");
    }

    const data = await res.json();
    setClassrooms((prev) =>
      prev.map((c) => (c.id === classroomId ? data.classroom : c)),
    );
  }

  async function removeMember(classroomId: string, memberId: string): Promise<void> {
    const currentList = demo ? loadDemoClassrooms() : classrooms;
    const target = currentList.find((c) => c.id === classroomId);
    if (!target) throw new Error("ไม่พบห้องเรียน");

    if (demo && user) {
      const updated = domainRemoveMember(target, memberId, user);
      const next = currentList.map((c) => (c.id === classroomId ? updated : c));
      setClassrooms(next);
      persistDemoClassrooms(next);
      return;
    }

    const res = await fetch(`/api/classrooms/${encodeURIComponent(classroomId)}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || errData.message || "ไม่สามารถลบสมาชิกได้");
    }

    const data = await res.json();
    setClassrooms((prev) =>
      prev.map((c) => (c.id === classroomId ? data.classroom : c)),
    );
  }

  async function archiveClassroom(classroomId: string): Promise<void> {
    const currentList = demo ? loadDemoClassrooms() : classrooms;
    const target = currentList.find((c) => c.id === classroomId);
    if (!target) throw new Error("ไม่พบห้องเรียน");

    if (demo && user) {
      const updated = domainArchiveClassroom(target, user);
      const next = currentList.map((c) => (c.id === classroomId ? updated : c));
      setClassrooms(next);
      persistDemoClassrooms(next);
      return;
    }

    const res = await fetch(`/api/classrooms/${encodeURIComponent(classroomId)}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || errData.message || "ไม่สามารถเก็บห้องเรียนถาวรได้");
    }

    const data = await res.json();
    setClassrooms((prev) =>
      prev.map((c) => (c.id === classroomId ? data.classroom : c)),
    );
  }

  async function joinClassroom(code: string): Promise<Classroom> {
    if (demo) {
      const currentList = loadDemoClassrooms();
      const target = currentList.find(
        (c) =>
          c.slug.toLowerCase() === code.trim().toLowerCase() ||
          c.id === code.trim(),
      );
      if (!target) throw new Error("ไม่พบห้องเรียนจากรหัสที่ระบุ");
      const isMember = target.members.some((m) => m.user_id === user?.id);
      if (!isMember && user) {
        target.members.push({
          id: `mem-${Date.now()}`,
          classroom_id: target.id,
          user_id: user.id,
          role: "STUDENT",
          joined_at: new Date().toISOString(),
          display_name: user.name,
          email: user.email,
          status: "ACTIVE",
        });
        persistDemoClassrooms(currentList);
        setClassrooms([...currentList]);
      }
      return target;
    }

    const res = await fetch("/api/classrooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "ไม่สามารถเข้าร่วมห้องเรียนได้");
    }
    const data = await res.json();
    setClassrooms((prev) => {
      const exists = prev.some((c) => c.id === data.classroom.id);
      return exists
        ? prev.map((c) => (c.id === data.classroom.id ? data.classroom : c))
        : [data.classroom, ...prev];
    });
    return data.classroom;
  }

  async function linkAssignment(
    classroomId: string,
    assignmentId: string,
  ): Promise<void> {
    if (demo) {
      const currentList = loadDemoClassrooms();
      const target = currentList.find((c) => c.id === classroomId);
      if (target) {
        const nextIds = target.assignment_ids || [];
        if (!nextIds.includes(assignmentId)) {
          target.assignment_ids = [...nextIds, assignmentId];
          persistDemoClassrooms(currentList);
          setClassrooms([...currentList]);
        }
      }
      return;
    }

    const res = await fetch(
      `/api/classrooms/${encodeURIComponent(classroomId)}/assignments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "ไม่สามารถเชื่อมโยง Assignment ได้");
    }
    const data = await res.json();
    setClassrooms((prev) =>
      prev.map((c) => (c.id === classroomId ? data.classroom : c)),
    );
  }

  return {
    classrooms,
    loading,
    refresh,
    createClassroom,
    joinClassroom,
    linkAssignment,
    importRoster,
    addStaff,
    removeMember,
    archiveClassroom,
    setClassrooms,
  };
}
