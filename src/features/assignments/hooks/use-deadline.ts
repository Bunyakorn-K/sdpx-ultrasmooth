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

export interface DeadlineCountdown {
  expired: boolean;
  isUrgent: boolean;
  remainingMs: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export function useDeadlineCountdown(deadline: string): DeadlineCountdown {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const deadlineTime = new Date(deadline).getTime();
  if (Number.isNaN(deadlineTime)) {
    return {
      expired: false,
      isUrgent: false,
      remainingMs: Infinity,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: "",
    };
  }

  const expired = deadlineTime <= now;
  const remainingMs = Math.max(0, deadlineTime - now);
  const isUrgent = !expired && remainingMs < 48 * 60 * 60 * 1000;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted =
    hours > 0
      ? `${hours} ชั่วโมง ${minutes} นาที`
      : `${minutes} นาที ${seconds} วินาที`;

  return {
    expired,
    isUrgent,
    remainingMs,
    hours,
    minutes,
    seconds,
    formatted,
  };
}
