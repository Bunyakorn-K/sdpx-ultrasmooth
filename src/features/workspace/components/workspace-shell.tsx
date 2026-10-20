"use client";
import {
  ArrowOutward,
  DescriptionOutlined,
  Logout,
  MenuBookOutlined,
  SchoolOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";

import type { WorkspaceController } from "@/features/workspace/hooks/use-workspace-controller";
import type { ReactNode } from "react";
import { DemoStudentSwitcher } from "./demo-student-switcher";
export function WorkspaceShell({
  controller,
  children,
}: {
  controller: WorkspaceController;
  children: ReactNode;
}) {
  const {
    setFilter,
    signOut,
    setView,
    teacher,
    user,
    nav,
    setNav,
    assignments,
    demo,
    setError,
    active,
    enterDemo,
    switchDemoStudent,
    openModal,
  } = controller;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          type="button"
          className="wordmark"
          onClick={() => setView("home")}
        >
          pair<span>wise</span>
          <i>✳</i>
        </button>
        <div className="workspace-label">{teacher ? "TEACHER" : "STUDENT"}</div>
        <div className="workspace-switch">
          <span className="workspace-icon">
            <SchoolOutlined />
          </span>
          <span>
            {teacher ? "บัญชีคุณครู" : "บัญชีนักเรียน"}
            <small>{user?.name}</small>
          </span>
        </div>
        <nav className="sidebar-nav" aria-label="เมนูพื้นที่การเรียนรู้">
          <button
            className={nav === "classrooms" ? "selected" : ""}
            aria-current={nav === "classrooms" ? "page" : undefined}
            onClick={() => {
              setNav("classrooms");
            }}
          >
            <SchoolOutlined />
            ห้องเรียนของฉัน
          </button>
          <button
            className={nav === "assignments" ? "selected" : ""}
            aria-current={nav === "assignments" ? "page" : undefined}
            onClick={() => {
              setNav("assignments");
              setFilter("all");
            }}
          >
            <DescriptionOutlined />
            Assignment ของฉัน<span>{assignments.length}</span>
          </button>
          <button
            onClick={() => {
              setView("home");
              setTimeout(
                () => document.getElementById("how")?.scrollIntoView(),
                100,
              );
            }}
          >
            <MenuBookOutlined />
            วิธีการใช้งาน
            <ArrowOutward sx={{ fontSize: 18, ml: "auto" }} />
          </button>
        </nav>
        <div className="sidebar-tip">
          <div>
            Small feedback,
            <br />
            <strong>big growth.</strong>
          </div>
          <p>
            ทุกความคิดเห็น คือโอกาส
            <br />
            ในการเรียนรู้สิ่งใหม่
          </p>
          <span>✳</span>
        </div>
        <div className="user-box">
          <Avatar
            sx={{
              bgcolor: "#d9eee6",
              color: "#34866e",
              width: 37,
              height: 37,
              fontSize: 18,
            }}
          >
            {user?.name[0]}
          </Avatar>
          <div>
            <strong>{user?.name}</strong>
            <small>{teacher ? "บัญชีคุณครู" : "บัญชีนักเรียน"}</small>
          </div>
          <Tooltip title="ออกจากระบบ">
            <IconButton
              aria-label="ออกจากระบบ"
              onClick={async () => {
                try {
                  await signOut();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <Logout sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <span>
            {active ? (
              <>
                {nav === "classrooms"
                  ? "ห้องเรียนของฉัน"
                  : "Assignment ของฉัน"}{" "}
                <span className="breadcrumb">/</span>{" "}
                <strong>{active.title}</strong>
              </>
            ) : (
              <strong>
                {nav === "classrooms"
                  ? "ห้องเรียนของฉัน"
                  : "Assignment ของฉัน"}
              </strong>
            )}
          </span>
          <div>
            {demo && (
              <Chip
                size="small"
                label="โหมดสาธิต"
                sx={{ bgcolor: "#edf7f3", color: "#41957d" }}
              />
            )}
            {demo && (
              <Button
                size="small"
                color="inherit"
                onClick={() => enterDemo(teacher ? "student" : "teacher")}
              >
                สลับเป็น{teacher ? "นักเรียน" : "ครู"}
              </Button>
            )}
          </div>
        </header>
        <main className="dashboard">
          {demo && !teacher && user && (
            <div style={{ marginBottom: 20 }}>
              <DemoStudentSwitcher
                userId={user.id}
                assignment={active ?? assignments[0]}
                onChange={switchDemoStudent}
              />
            </div>
          )}
          {demo && (
            <Alert
              severity="info"
              icon={false}
              sx={{ mb: 3, bgcolor: "#f0f8fa", fontSize: 14 }}
            >
              กำลังทดลองด้วยข้อมูลตัวอย่าง บันทึกเฉพาะในเบราว์เซอร์นี้{" "}
              <button
                type="button"
                className="inline-action"
                onClick={() => openModal("login")}
              >
                เข้าสู่ระบบเพื่อใช้ข้อมูลจริง →
              </button>
            </Alert>
          )}
          {children}
        </main>
        <footer className="app-footer">
          <span>pairwise — พื้นที่ของทุกเสียง</span>
          <span>Learn together. Grow together.</span>
        </footer>
      </div>
    </div>
  );
}
