import { database } from "@/shared/server/database";
import type { User } from "../types";
import { ROSTER_PENDING_PASSWORD } from "../domain/pending-account";

export type UserWithPassword = User & { password_hash: string };
export interface UserRepository {
  findByEmail(email: string): Promise<UserWithPassword | null>;
  create(user: User, passwordHash: string): Promise<User | null>;
}
export class PostgresUserRepository implements UserRepository {
  async findByEmail(email: string) {
    const sql = database();
    const rows =
      await sql`SELECT id, name, email, role, password_hash FROM users WHERE email=${email}`;
    return (rows[0] as UserWithPassword) || null;
  }
  async create(user: User, passwordHash: string) {
    const sql = database();
    const rows =
      await sql`INSERT INTO users(id,name,email,password_hash,role) VALUES(${user.id},${user.name},${user.email},${passwordHash},${user.role}) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash WHERE users.password_hash=${ROSTER_PENDING_PASSWORD} AND users.role='student' AND EXCLUDED.role='student' RETURNING id,name,email,role`;
    return (rows[0] as User) || null;
  }
}
export {
  PostgresUserRepository as NeonUserRepository,
  PostgresUserRepository as SupabaseUserRepository,
};
