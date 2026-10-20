import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const deriveKey = promisify(scrypt);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await deriveKey(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  // Hosted identities and malformed legacy values cannot use local passwords.
  if (!/^[a-f\d]{32}:[a-f\d]{128}$/i.test(stored)) return false;
  const [salt, hex] = stored.split(":");
  const key = (await deriveKey(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(hex, "hex");
  return key.length === storedKey.length && timingSafeEqual(key, storedKey);
}
