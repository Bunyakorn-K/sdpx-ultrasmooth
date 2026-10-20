"use client";
import { useEffect, useState } from "react";
export function useDeadline(deadline: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return new Date(deadline).getTime() <= now;
}
