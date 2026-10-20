import { AppError } from "@/shared/domain/app-error";
import { randomUUID } from "node:crypto";
import type { User } from "../types";
import { hashPassword, verifyPassword } from "./password-service";
import type { UserRepository } from "./user-repository";
import { parseCredentials, parseRegistration } from "./auth-validation";
export class AuthService {
  constructor(private readonly users: UserRepository) {}
  async authenticate(input: Record<string, unknown>): Promise<User> {
    const { email, password } = parseCredentials(input);
    if (input.action === "register")
      return this.register(input, email, password);
    if (input.action !== "login") throw new AppError("คำขอไม่ถูกต้อง");
    const stored = await this.users.findByEmail(email);
    if (!stored || !(await verifyPassword(password, stored.password_hash)))
      throw new AppError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    return {
      id: stored.id,
      name: stored.name,
      email: stored.email,
      role: stored.role,
    };
  }
  private async register(
    input: Record<string, unknown>,
    email: string,
    password: string,
  ) {
    const { name, role } = parseRegistration(input);
    const user: User = {
      id: randomUUID(),
      name,
      email,
      role,
    };
    const created = await this.users.create(user, await hashPassword(password));
    if (!created) throw new AppError("อีเมลนี้ถูกใช้งานแล้ว", 409);
    return created;
  }
}
