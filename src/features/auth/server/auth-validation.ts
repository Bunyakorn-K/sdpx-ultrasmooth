import { AppError } from "@/shared/domain/app-error";
import type { User } from "../types";

export function parseCredentials(input: Record<string, unknown>) {
  const email = String(input.email || "").trim().toLowerCase();
  const password = String(input.password || "");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128)
    throw new AppError("กรุณากรอกอีเมลและรหัสผ่าน 8–128 ตัวอักษร");
  return { email, password };
}

export function parseRegistration(input: Record<string, unknown>) {
  const name = String(input.name || "").trim();
  if (!name || name.length > 100 || !["teacher", "student"].includes(String(input.role)))
    throw new AppError("กรุณากรอกชื่อไม่เกิน 100 ตัวอักษรและเลือกบทบาท");
  return { name, role: input.role as User["role"] };
}
