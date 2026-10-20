"use client";
import { DEFAULT_QUESTIONS } from "@/features/assignments/constants";
import {
  demoStudent,
  demoTeacher,
  demoStudents,
} from "@/features/auth/data/demo-users";
import { loadDemoAssignments } from "@/features/assignments/data/demo-storage";
import { useAssignments } from "@/features/assignments/hooks/use-assignments";
import {
  exportAnswersToExcel,
  readQuestionsFromExcel,
} from "@/features/assignments/services/excel-service";
import type { Assignment } from "@/features/assignments/types";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useClassrooms } from "@/features/classroom/hooks/use-classrooms";
import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
export type WorkspaceModal =
  "login" | "register" | "create" | "join" | "group" | "questions" | null;
const parseQuestions = (text: string) =>
  text
    .split("\n")
    .map((question) => question.trim())
    .filter(Boolean);
export function useWorkspaceController() {
  const router = useRouter();
  const pathname = usePathname();
  const view = pathname === "/" ? "home" : "dashboard";
  const selected = pathname.startsWith("/assignments/")
    ? decodeURIComponent(pathname.split("/")[2])
    : null;
  function setView(next: "home" | "dashboard") {
    router.push(next === "home" ? "/" : "/assignments");
  }
  function setSelected(id: string | null) {
    router.push(id ? `/assignments/${encodeURIComponent(id)}` : "/assignments");
  }
  const [modal, setModal] = useState<WorkspaceModal>(null);
  const [modalContext, setModalContext] = useState<{
    classroomId?: string;
    classroomName?: string;
  } | null>(null);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    if (pathname !== "/" || !signingOut) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setSigningOut(false);
    });
    return () => {
      active = false;
    };
  }, [pathname, signingOut]);
  const [questionText, setQuestionText] = useState(
    DEFAULT_QUESTIONS.join("\n"),
  );
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const nav = pathname.startsWith("/classrooms") ? "classrooms" : "assignments";
  function setNav(next: string) {
    router.push(next === "classrooms" ? "/classrooms" : "/assignments");
  }
  const auth = useAuth(setError);
  const collection = useAssignments(auth.user, auth.demo, setError);
  const classroomsCollection = useClassrooms(auth.user, auth.demo, setError);

  const { refresh: refreshAssignments } = collection;
  const { refresh: refreshClassrooms } = classroomsCollection;

  useEffect(() => {
    if (!auth.user) return;
    void refreshAssignments();
    void refreshClassrooms();
  }, [pathname, auth.user, refreshAssignments, refreshClassrooms]);

  const { user, demo } = auth;
  const { assignments, execute, setAssignments } = collection;
  const { classrooms } = classroomsCollection;
  const active = assignments.find((assignment) => assignment.id === selected);
  const teacher = user?.role === "teacher";
  const filtered = assignments.filter(
    (assignment) =>
      (filter === "all" || assignment.status === filter) &&
      `${assignment.title} ${assignment.subject}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const currentView = view;
  function openModal(
    nextModal: WorkspaceModal,
    context?: { classroomId?: string; classroomName?: string },
  ) {
    setError("");
    setModalContext(context || null);
    if (nextModal === "login" || nextModal === "register") {
      setModal(null);
      router.push(`/${nextModal}`);
      return;
    }
    setModal(nextModal);
  }
  function enterDemo(role: "teacher" | "student") {
    auth.startDemo(role === "teacher" ? demoTeacher : demoStudent);
    setAssignments(loadDemoAssignments());
    setView("dashboard");
    setModal(null);
    setError("");
    setFilter("all");
  }
  function switchDemoStudent(id: string) {
    const student = demoStudents.find((candidate) => candidate.id === id);
    if (!demo || !student) return;
    auth.startDemo(student);
    setVoteTarget(null);
    setScores([]);
    setModal(null);
    setError("");
    setToast("");
  }
  async function signOut() {
    // Keep the auth guard idle until the requested home navigation commits.
    setSigningOut(true);
    try {
      await auth.signOut();
      setAssignments([]);
      setModal(null);
      setView("home");
    } catch (cause) {
      setSigningOut(false);
      throw cause;
    }
  }
  async function runTask(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }
  async function action(command: string, input: Record<string, unknown> = {}) {
    await runTask(async () => {
      const assignment = await execute({
        action: command,
        id: active?.id,
        ...input,
      });
      setModal(null);
      setVoteTarget(null);
      if (command === "join") setSelected(assignment.id);
      const messages: Record<string, string> = {
        stop: "หยุดโหวตและรวมคะแนนแล้ว",
        vote: "บันทึกคะแนนเรียบร้อยแล้ว",
      };
      setToast(messages[command] || "บันทึกเรียบร้อยแล้ว");
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (
      pathname === "/login" ||
      pathname === "/register" ||
      modal === "login" ||
      modal === "register"
    ) {
      const mode =
        pathname === "/register" || modal === "register"
          ? "register"
          : "login";
      await runTask(async () => {
        await auth.authenticate(mode, fields);
        setView("dashboard");
        setModal(null);
      });
      return;
    }
    if (modal === "create") {
      await runTask(async () => {
        const classroomId =
          String(fields.classroomId || "").trim() ||
          modalContext?.classroomId ||
          undefined;
        const assignment = await execute({
          action: "create",
          ...fields,
          classroomId,
          deadline: new Date(String(fields.deadline)).toISOString(),
          questions: parseQuestions(
            String(fields.questions || questionText || ""),
          ).length
            ? parseQuestions(String(fields.questions || questionText))
            : DEFAULT_QUESTIONS,
        });
        if (classroomId) {
          try {
            await fetch(
              `/api/classrooms/${encodeURIComponent(classroomId)}/assignments`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignmentId: assignment.id }),
              },
            );
          } catch {
            // ignore
          }
        }
        setSelected(assignment.id);
        setTab(0);
        setModal(null);
        setModalContext(null);
        setToast("สร้าง assignment แล้ว แชร์รหัสให้นักเรียนได้เลย");
      });
      return;
    }
    if (modal === "join") await action("join", { code: fields.code });
    if (modal === "group") await action("group", { name: fields.name });
    if (modal === "questions")
      await action("questions", { questions: parseQuestions(questionText) });
  }
  async function importExcel(file?: File) {
    if (!file) return;
    await runTask(async () => {
      const questions = await readQuestionsFromExcel(file);
      setQuestionText(questions.join("\n"));
      setToast(`นำเข้า ${questions.length} คำถาม กรุณากดบันทึก`);
    });
  }
  async function exportExcel(assignment: Assignment) {
    await runTask(async () => {
      await exportAnswersToExcel(assignment);
      setToast("ส่งออกไฟล์ Excel เรียบร้อยแล้ว");
    });
  }
  return {
    view: currentView,
    setView,
    user,
    setUser: auth.setUser,
    demo,
    assignments,
    setAssignments,
    classrooms,
    selected,
    setSelected,
    modal,
    setModal,
    modalContext,
    setModalContext,
    tab,
    setTab,
    filter,
    setFilter,
    search,
    setSearch,
    toast,
    setToast,
    error,
    setError,
    busy,
    questionText,
    setQuestionText,
    voteTarget,
    setVoteTarget,
    scores,
    setScores,
    configured: auth.configured,
    ready: auth.ready,
    loadingAssignments: collection.loading,
    refreshAssignments: collection.refresh,
    refreshClassrooms: classroomsCollection.refresh,
    signingOut,
    nav,
    setNav,
    active,
    teacher,
    enterDemo,
    switchDemoStudent,
    openModal,
    action,
    submit,
    importExcel,
    exportExcel,
    filtered,
    signOut,
  };
}
export type WorkspaceController = ReturnType<typeof useWorkspaceController>;
