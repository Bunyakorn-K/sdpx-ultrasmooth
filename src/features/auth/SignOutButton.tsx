"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return <div className="text-sm">
    <button disabled={pending} onClick={async () => {
      setPending(true);
      setFailed(false);
      try {
        const response = await fetch("/api/auth/sign-out", { method: "POST" });
        if (!response.ok) throw new Error();
        router.push("/sign-in");
        router.refresh();
      } catch { setFailed(true); } finally { setPending(false); }
    }}>{pending ? "Signing out…" : "Sign out"}</button>
    {failed && <p role="alert">Could not sign out. Try again.</p>}
  </div>;
}
