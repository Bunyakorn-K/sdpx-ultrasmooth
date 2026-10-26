"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  BugReport,
  ExpandLess,
  ExpandMore,
  FlashOn,
  PersonAdd,
  Refresh,
} from "@mui/icons-material";
import type { User } from "../types";

export function DevAuthDebugger() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/dev/users");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { users: User[] };
      setUsers(data.users || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load dev accounts",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && users.length === 0) {
      void fetchUsers();
    }
  };

  // Fill form inputs on the current page
  const fillForm = (email: string, password = "password123") => {
    const emailInput = document.querySelector(
      'input[name="email"]',
    ) as HTMLInputElement | null;
    const passwordInput = document.querySelector(
      'input[name="password"]',
    ) as HTMLInputElement | null;

    if (emailInput) {
      emailInput.value = email;
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      emailInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (passwordInput) {
      passwordInput.value = password;
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
      passwordInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setStatusMsg(`กรอกอีเมล ${email} ลงในฟอร์มแล้ว`);
    setTimeout(() => setStatusMsg(""), 3500);
  };

  // Instant switch / 1-click session login
  const switchUser = async (userId: string) => {
    startTransition(async () => {
      try {
        setError("");
        const res = await fetch("/api/dev/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "switch", userId }),
        });
        if (!res.ok) throw new Error("Switch failed");
        window.location.href = "/classrooms";
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Switch failed");
      }
    });
  };

  // Quick create a new account
  const quickCreate = async (
    role: "teacher" | "student",
    autoLogin = false,
  ) => {
    startTransition(async () => {
      try {
        setError("");
        const res = await fetch("/api/dev/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "quick-create", role, autoLogin }),
        });
        if (!res.ok) throw new Error("Create user failed");
        const data = (await res.json()) as {
          user: User;
          defaultPassword: string;
        };
        await fetchUsers();
        setSelectedUser(data.user);

        if (autoLogin) {
          window.location.href = "/classrooms";
        } else {
          fillForm(data.user.email, data.defaultPassword);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Quick create failed");
      }
    });
  };

  // Presets from loaded users
  const teachers = users.filter((u) => u.role === "teacher");
  const students = users.filter((u) => u.role === "student");

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: { xs: "calc(100vw - 40px)", sm: 420 },
        width: "100%",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          borderRadius: "14px",
          border: "2px solid",
          borderColor: "warning.main",
          bgcolor: "background.paper",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header Bar */}
        <Box
          onClick={handleToggle}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1,
            bgcolor: "warning.light",
            color: "warning.contrastText",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <BugReport fontSize="small" />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Dev Auth Debugger
            </Typography>
            <Chip
              size="small"
              label="Local Dev"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 700,
                bgcolor: "warning.main",
                color: "#fff",
              }}
            />
          </Stack>
          <IconButton size="small" sx={{ p: 0.5, color: "inherit" }}>
            {open ? <ExpandMore /> : <ExpandLess />}
          </IconButton>
        </Box>

        {/* Collapsible Content */}
        <Collapse in={open}>
          <Box sx={{ p: 2, maxHeight: "70vh", overflowY: "auto" }}>
            {error && (
              <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
                {error}
              </Alert>
            )}
            {statusMsg && (
              <Alert severity="success" sx={{ mb: 1.5, py: 0.5 }}>
                {statusMsg}
              </Alert>
            )}

            {/* Section 1: Quick Presets */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, textTransform: "uppercase" }}
            >
              ⚡ Presets ด่วนในระบบ (1-Click Switch)
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 0.8, mb: 2, flexWrap: "wrap", gap: 0.8 }}
            >
              {teachers.slice(0, 2).map((t) => (
                <Tooltip key={t.id} title={`${t.email} (คลิกเพื่อเข้าสู่ระบบทันที)`}>
                  <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    disabled={isPending}
                    startIcon={<FlashOn sx={{ fontSize: 14 }} />}
                    onClick={() => void switchUser(t.id)}
                    sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.4 }}
                  >
                    ครู: {t.name.split(" ")[0]}
                  </Button>
                </Tooltip>
              ))}
              {students.slice(0, 2).map((s) => (
                <Tooltip key={s.id} title={`${s.email} (คลิกเพื่อเข้าสู่ระบบทันที)`}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    disabled={isPending}
                    startIcon={<FlashOn sx={{ fontSize: 14 }} />}
                    onClick={() => void switchUser(s.id)}
                    sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.4 }}
                  >
                    นร.: {s.name.split(" ")[0]}
                  </Button>
                </Tooltip>
              ))}
              {teachers.length === 0 && students.length === 0 && !loading && (
                <Typography variant="caption" color="text.secondary">
                  ยังไม่มี User ในฐานข้อมูล ลองกดปุ่มสร้างด้านล่าง
                </Typography>
              )}
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            {/* Section 2: Autocomplete / User Search */}
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                mb: 0.8,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700, textTransform: "uppercase" }}
              >
                🔍 เลือกจาก User ทั้งหมด ({users.length})
              </Typography>
              <Tooltip title="รีเฟรชรายชื่อ">
                <IconButton
                  size="small"
                  onClick={() => void fetchUsers()}
                  disabled={loading}
                >
                  <Refresh sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>

            <Autocomplete
              size="small"
              options={users}
              value={selectedUser}
              onChange={(_, value) => {
                setSelectedUser(value);
                if (value) fillForm(value.email);
              }}
              loading={loading}
              getOptionLabel={(option) =>
                `${option.name} (${option.email}) [${option.role}]`
              }
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ width: "100%" }}>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {option.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={
                          option.role === "teacher" ? "Teacher" : "Student"
                        }
                        color={
                          option.role === "teacher" ? "secondary" : "default"
                        }
                        sx={{ height: 18, fontSize: "0.65rem" }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {option.email}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} placeholder="พิมพ์ค้นหาชื่อ หรืออีเมล..." />
              )}
            />

            {selectedUser && (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  disabled={isPending}
                  onClick={() => void switchUser(selectedUser.id)}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                >
                  {isPending ? "กำลังเข้าสู่ระบบ..." : "สลับเข้าใช้งานทันที"}
                </Button>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  onClick={() => fillForm(selectedUser.email)}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                >
                  กรอกลงฟอร์ม
                </Button>
              </Stack>
            )}

            <Divider sx={{ my: 1.5 }} />

            {/* Section 3: Quick Create Test User */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, textTransform: "uppercase" }}
            >
              ➕ สร้างบัญชีทดสอบด่วน (รหัส: password123)
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                fullWidth
                size="small"
                variant="outlined"
                color="secondary"
                disabled={isPending}
                startIcon={<PersonAdd sx={{ fontSize: 16 }} />}
                onClick={() => void quickCreate("teacher", false)}
                sx={{ textTransform: "none", fontSize: "0.75rem" }}
              >
                + ครูทดสอบ
              </Button>
              <Button
                fullWidth
                size="small"
                variant="outlined"
                color="primary"
                disabled={isPending}
                startIcon={<PersonAdd sx={{ fontSize: 16 }} />}
                onClick={() => void quickCreate("student", false)}
                sx={{ textTransform: "none", fontSize: "0.75rem" }}
              >
                + นักเรียนทดสอบ
              </Button>
            </Stack>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
}
