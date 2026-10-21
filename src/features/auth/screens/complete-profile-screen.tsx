"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  CircularProgress,
  MenuItem,
  TextField,
  Typography,
  Chip,
  Box,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { createClient } from "@/shared/lib/supabase/client";
import { PersonArt } from "@/shared/components/person-art";
import { postJson } from "@/shared/services/http-client";
import { useWorkspace } from "@/features/workspace/context/workspace-provider";
import type { User } from "../types";

export function CompleteProfileScreen() {
  const router = useRouter();
  const workspace = useWorkspace();
  const [name, setName] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadGoogleUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !user.email) {
          console.warn("[complete-profile] No Supabase user found, redirecting to login");
          router.push("/login?error=session_not_found");
          return;
        }

        if (mounted) {
          setEmail(user.email);
          const suggestedName =
            (user.user_metadata?.full_name as string) ||
            (user.user_metadata?.name as string) ||
            user.email.split("@")[0] ||
            "";
          setName(suggestedName);
        }
      } catch (err) {
        console.error("[complete-profile] Error checking Supabase user:", err);
        if (mounted) {
          router.push("/login?error=session_error");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadGoogleUser();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("กรุณากรอกชื่อที่แสดง");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await postJson<{ ok: boolean; user: User }>(
        "/api/auth/complete-profile",
        {
          name: name.trim(),
          role,
        },
      );
      if (res.user) {
        workspace.setUser(res.user);
      }
      workspace.setToast("ตั้งค่าโปรไฟล์เรียบร้อยแล้ว");
      router.push("/classrooms");
      router.refresh();
    } catch (err: unknown) {
      setSubmitting(false);
      const msg =
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
      setError(msg);
      workspace.setError(msg);
    }
  }

  return (
    <div className="landing auth-page">
      <div className="blue-blob" />
      <div className="cream-blob" />
      <div className="site-sheet">
        <header className="landing-header">
          <Link href="/" className="wordmark">
            pair<span>wise</span>
            <i>✳</i>
          </Link>
          <Link href="/login" className="auth-home-link">
            เปลี่ยนบัญชี →
          </Link>
        </header>

        <main className="auth-layout">
          <section className="auth-intro" aria-label="ยินดีต้อนรับ">
            <span className="auth-eyebrow">WELCOME TO PAIRWISE</span>
            <h2>
              ยินดีต้อนรับ
              <br />
              สู่พื้นที่แห่งการ
              <br />
              <em>เติบโตไปด้วยกัน</em>
            </h2>
            <p>กรอกข้อมูลเริ่มต้นอีกนิด เพื่อเริ่มใช้งานระบบ</p>
            <PersonArt variant={1} color="#d8eee5" />
          </section>

          <section className="auth-card" aria-labelledby="profile-setup-title">
            <h1 id="profile-setup-title">ตั้งค่าโปรไฟล์เริ่มต้น</h1>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress color="primary" />
              </Box>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-fields">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    className="form-description"
                  >
                    ยืนยันตัวตนด้วย Google สำเร็จแล้ว กรุณาระบุชื่อที่แสดงและบทบาทเพื่อใช้งานระบบ
                  </Typography>

                  {email && (
                    <Box sx={{ mb: 1 }}>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={`เชื่อมต่อแล้ว: ${email}`}
                        color="success"
                        variant="outlined"
                        size="small"
                        sx={{ fontSize: "0.85rem", py: 1.5, px: 0.5 }}
                      />
                    </Box>
                  )}

                  <TextField
                    name="name"
                    label="ชื่อที่แสดง"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    slotProps={{ htmlInput: { maxLength: 100 } }}
                    helperText="ชื่อที่ครูและเพื่อนร่วมกลุ่มจะมองเห็น"
                  />

                  <TextField
                    select
                    name="role"
                    label="ฉันเป็น"
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as "teacher" | "student")
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                  >
                    <MenuItem value="teacher">คุณครู (Teacher / Instructor)</MenuItem>
                    <MenuItem value="student">นักเรียน (Student)</MenuItem>
                  </TextField>

                  {/* FR-PRIV-01: PDPA Privacy Notice */}
                  <Alert severity="info" sx={{ mt: 1, borderRadius: "8px", fontSize: "0.8rem" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
                      ประกาศการคุ้มครองข้อมูลส่วนบุคคล (PDPA Notice — FR-PRIV-01)
                    </Typography>
                    ระบบจะจัดเก็บอีเมล ชื่อ และผลการประเมินเป็นเวลา 2 ปีการศึกษา (time-on-task 1 ปีการศึกษา) เพื่อการประเมินผลและการตรวจสอบความสุจริตทางวิชาการ โดยข้อมูลตัวตนผู้ประเมินจะถูกปกปิดเป็นความลับตามมาตรฐาน Anonymity
                  </Alert>

                  {error && <Alert severity="error">{error}</Alert>}
                </div>

                <div className="auth-actions">
                  <Button
                    fullWidth
                    variant="contained"
                    type="submit"
                    disabled={submitting}
                    sx={{ py: 1.2, fontWeight: 600 }}
                  >
                    {submitting ? (
                      <CircularProgress size={22} color="inherit" />
                    ) : (
                      "ดำเนินการต่อ"
                    )}
                  </Button>

                  <Button
                    fullWidth
                    color="inherit"
                    onClick={async () => {
                      const supabase = createClient();
                      await supabase.auth.signOut();
                      router.push("/login");
                    }}
                    disabled={submitting}
                  >
                    ออกจากระบบ หรือเปลี่ยนบัญชี
                  </Button>
                </div>
              </form>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
