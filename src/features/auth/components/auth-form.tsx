"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import type { FormEventHandler } from "react";
import { createClient } from "@/shared/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "register";
  busy: boolean;
  configured: boolean | null;
  error: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onSwitch: (mode: "login" | "register") => void;
  onDemo: () => void;
};

export function AuthForm({
  mode,
  busy,
  configured,
  error,
  onSubmit,
  onSwitch,
  onDemo,
}: AuthFormProps) {
  const registering = mode === "register";
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setGoogleError("");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "ยังไม่พบ NEXT_PUBLIC_SUPABASE_URL หรือ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ใน .env.local (หากเพิ่งใส่ค่า กรุณา Restart เซิร์ฟเวอร์ Next.js ด้วย `npm run dev` ใหม่อีกครั้ง)",
        );
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signInError) throw signInError;
    } catch (err: unknown) {
      setGoogleLoading(false);
      setGoogleError(
        err instanceof Error
          ? err.message
          : "ไม่สามารถเชื่อมต่อ Google OAuth ได้ กรุณาตรวจสอบการตั้งค่า Supabase",
      );
    }
  };

  return (
    <form
      className="auth-form"
      aria-label={registering ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
      onSubmit={onSubmit}
    >
      <div className="form-fields">
        <p className="form-description">
          {registering
            ? "ให้ทุกเสียงเป็นส่วนหนึ่งของการเรียนรู้"
            : "เข้าสู่ระบบเพื่อจัดการห้องเรียนและการประเมิน"}
        </p>
        {configured === false && (
          <Alert severity="info">
            ยังไม่ได้เชื่อมต่อฐานข้อมูล Supabase สามารถลองใช้งานตัวอย่างก่อนได้
          </Alert>
        )}

        <Button
          fullWidth
          variant="outlined"
          startIcon={<GoogleIcon />}
          disabled={busy || googleLoading}
          onClick={handleGoogleSignIn}
          sx={{
            py: 1.2,
            borderColor: "rgba(0,0,0,0.2)",
            color: "#1f2937",
            backgroundColor: "#fff",
            "&:hover": {
              backgroundColor: "#f9fafb",
              borderColor: "rgba(0,0,0,0.35)",
            },
            fontWeight: 600,
            textTransform: "none",
          }}
        >
          {googleLoading ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "เข้าสู่ระบบด้วย Google"
          )}
        </Button>
        {googleError && <Alert severity="error">{googleError}</Alert>}

        <Divider
          sx={{ my: 0.5, typography: "caption", color: "text.secondary" }}
        >
          หรือเข้าสู่ระบบด้วยบัญชี
        </Divider>

        {registering && (
          <>
            <TextField
              name="name"
              label="ชื่อที่แสดง"
              autoComplete="name"
              required
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              select
              name="role"
              label="ฉันเป็น"
              defaultValue="teacher"
              slotProps={{ inputLabel: { shrink: true } }}
            >
              <MenuItem value="teacher">คุณครู</MenuItem>
              <MenuItem value="student">นักเรียน</MenuItem>
            </TextField>
          </>
        )}
        <TextField
          name="email"
          label="อีเมล"
          type="email"
          autoComplete="email"
          required
        />
        <TextField
          name="password"
          label="รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
          type="password"
          autoComplete={registering ? "new-password" : "current-password"}
          slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
          required
        />
        {registering && (
          <Alert severity="info" sx={{ mt: 1, borderRadius: "8px" }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, display: "block", mb: 0.5 }}
            >
              ประกาศการคุ้มครองข้อมูลส่วนบุคคล (PDPA Notice — FR-PRIV-01)
            </Typography>
            ระบบจัดเก็บข้อมูล (อีเมล, ชื่อ, ผลการประเมิน) 2 ปีการศึกษา
            เพื่อใช้ประเมินผลและตรวจสอบความสุจริตทางวิชาการ
            โดยตัวตนผู้ประเมินจะถูกปกปิดเป็นความลับ
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </div>
      <div className="auth-actions">
        <Button fullWidth variant="contained" type="submit" disabled={busy}>
          {busy ? (
            <CircularProgress size={22} color="inherit" />
          ) : registering ? (
            "สร้างบัญชี"
          ) : (
            "เข้าสู่ระบบ"
          )}
        </Button>
        <Button
          component={Link}
          role="button"
          href={registering ? "/login" : "/register"}
          fullWidth
          color="inherit"
          disabled={busy}
          onClick={() => onSwitch?.(registering ? "login" : "register")}
        >
          {registering ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครสมาชิก"}
        </Button>
        <Button
          fullWidth
          type="button"
          color="secondary"
          disabled={busy}
          onClick={onDemo}
        >
          ทดลองใช้งานโดยไม่สมัครสมาชิก →
        </Button>
      </div>
    </form>
  );
}
