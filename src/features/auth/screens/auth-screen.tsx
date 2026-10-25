"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/features/workspace/context/workspace-provider";
import { AuthForm } from "../components/auth-form";
import { PersonArt } from "@/shared/components/person-art";

function formatAuthError(error?: string): string {
  if (!error) return "";
  if (error === "auth_failed") {
    return "ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่อีกครั้ง หรือตรวจสอบการตั้งค่า Supabase";
  }
  if (error === "access_denied") {
    return "การเข้าสู่ระบบถูกยกเลิก หรือไม่ได้รับอนุญาตจาก Google";
  }
  if (error === "session_expired" || error === "session_not_found") {
    return "ไม่พบเซสชันการเข้าสู่ระบบ กรุณาลองเข้าสู่ระบบด้วย Google ใหม่อีกครั้ง";
  }
  if (error === "no_auth_code") {
    return "ไม่พบรหัสยืนยันจาก Google OAuth กรุณาลองใหม่อีกครั้ง";
  }
  return decodeURIComponent(error);
}

export function AuthScreen({
  mode,
  initialError,
}: {
  mode: "login" | "register";
  initialError?: string;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const registering = mode === "register";
  const displayError = formatAuthError(initialError) || workspace.error;

  useEffect(() => {
    if (workspace.ready && workspace.user && !workspace.signingOut) {
      router.replace("/classrooms");
    }
  }, [workspace.ready, workspace.user, workspace.signingOut, router]);

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
          <Link href="/" className="auth-home-link">
            กลับหน้าแรก →
          </Link>
        </header>
        <main className="auth-layout">
          <section className="auth-intro" aria-label="เรียนรู้ไปด้วยกัน">
            <span className="auth-eyebrow">LEARN TOGETHER. GROW TOGETHER.</span>
            <h2>
              ทุกความคิดเห็น
              <br />
              สร้างการเรียนรู้
              <br />
              <em>ที่ดีกว่า</em>
            </h2>
            <p>พื้นที่ของทุกเสียง ที่ช่วยให้การทำงานกลุ่มเติบโตไปด้วยกัน</p>
            <PersonArt variant={1} color="#d8eee5" />
          </section>
          <section className="auth-card" aria-labelledby="auth-title">
            <h1 id="auth-title">
              {registering ? "เริ่มต้นการเรียนรู้ร่วมกัน" : "ยินดีต้อนรับกลับมา"}
            </h1>
            <AuthForm
              key={mode}
              mode={mode}
              busy={workspace.busy}
              configured={workspace.configured}
              error={displayError}
              onSubmit={workspace.submit}
              onSwitch={(target) => router.push(`/${target}`)}
              onDemo={() => workspace.enterDemo("teacher")}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
