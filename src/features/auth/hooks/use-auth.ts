"use client";
import { postJson, requestJson } from "@/shared/services/http-client";
import { useEffect, useRef, useState } from "react";
import type { User } from "../types";
import { demoUsers } from "../data/demo-users";

const DEMO_SESSION_KEY = "peerly-demo-user";
export function useAuth(onError: (message: string) => void) {
  const revision = useRef(0);
  const [user, setUser] = useState<User | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [demo, setDemo] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    const restoreRevision = revision.current;
    const restore = async () => {
      try {
        const stored = sessionStorage.getItem(DEMO_SESSION_KEY);
        const candidate: unknown = stored ? JSON.parse(stored) : null;
        if (
          candidate &&
          typeof candidate === "object" &&
          "role" in candidate &&
          "id" in candidate &&
          "name" in candidate &&
          "email" in candidate &&
          (candidate.role === "teacher" || candidate.role === "student") &&
          typeof candidate.id === "string" &&
          typeof candidate.name === "string" &&
          typeof candidate.email === "string"
        ) {
          const demoUser = demoUsers.find((item) => item.id === candidate.id);
          if (demoUser) {
            if (mounted) {
              setUser(demoUser);
              setDemo(true);
              setReady(true);
            }
            return;
          }
        }
      } catch {
        sessionStorage.removeItem(DEMO_SESSION_KEY);
      }
      await requestJson<{ user: User | null; configured: boolean }>("/api/auth")
        .then((result) => {
          if (!mounted || restoreRevision !== revision.current) return;
          setUser(result.user);
          setConfigured(result.configured);
        })
        .catch(() => {
          if (mounted) onError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
        })
        .finally(() => {
          if (mounted) setReady(true);
        });
    };
    void restore();
    return () => {
      mounted = false;
    };
  }, [onError]);
  async function authenticate(
    mode: "login" | "register",
    form: Record<string, unknown>,
  ) {
    revision.current += 1;
    const result = await postJson<{ user: User }>(`/api/auth/${mode}`, {
      ...form,
    });
    setUser(result.user);
    sessionStorage.removeItem(DEMO_SESSION_KEY);
    setDemo(false);
  }
  async function signOut() {
    revision.current += 1;
    if (!demo) await postJson("/api/auth/logout", {});
    sessionStorage.removeItem(DEMO_SESSION_KEY);
    setUser(null);
    setDemo(false);
  }
  function startDemo(demoUser: User) {
    revision.current += 1;
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    setDemo(true);
    setReady(true);
  }
  return {
    user,
    setUser,
    configured,
    demo,
    ready,
    startDemo,
    authenticate,
    signOut,
  };
}
