import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { kvGet, kvSet } from "./kv";
import type { Session } from "./session";

const scrypt = promisify(_scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
const KEY = "auth:users";

export interface User {
  email: string;
  name: string;
  role: "admin" | "membro";
  salt: string;
  hash: string;
  createdAt: string;
}

export const normEmail = (e: string) => e.trim().toLowerCase();

export async function listUsers(): Promise<User[]> {
  return (await kvGet<User[]>(KEY)) ?? [];
}

async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: (await scrypt(password, salt, 64)).toString("hex") };
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function addUser(input: { email: string; name: string; password: string; role?: "admin" | "membro" }) {
  const email = normEmail(input.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("E-mail inválido.");
  if (input.password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  if (email === normEmail(process.env.ADMIN_EMAIL ?? "")) throw new Error("Esse e-mail já é da administradora.");
  const users = await listUsers();
  const { salt, hash } = await hashPassword(input.password);
  const user: User = { email, name: input.name.trim() || email, role: input.role ?? "membro", salt, hash, createdAt: new Date().toISOString() };
  await kvSet(KEY, [...users.filter((u) => u.email !== email), user]);
  return user;
}

export async function removeUser(email: string) {
  const users = await listUsers();
  await kvSet(KEY, users.filter((u) => u.email !== normEmail(email)));
}

/** Confere e-mail e senha. A administradora vem das variáveis ADMIN_EMAIL e ADMIN_PASSWORD. */
export async function checkLogin(emailRaw: string, password: string): Promise<Omit<Session, "exp"> | null> {
  const email = normEmail(emailRaw);
  const adminEmail = normEmail(process.env.ADMIN_EMAIL ?? "");
  if (adminEmail && email === adminEmail) {
    return safeEqual(password, process.env.ADMIN_PASSWORD ?? "") ? { email, name: "Administradora", role: "admin" } : null;
  }
  const user = (await listUsers()).find((u) => u.email === email);
  if (!user) {
    await hashPassword(password); // mesmo tempo de resposta pra e-mail que não existe
    return null;
  }
  const { hash } = await hashPassword(password, user.salt);
  return safeEqual(hash, user.hash) ? { email: user.email, name: user.name, role: user.role } : null;
}

/** Limite simples: 6 tentativas erradas por e-mail a cada 15 minutos. */
export async function tooManyAttempts(email: string) {
  return ((await kvGet<number>(`auth:fail:${normEmail(email)}`)) ?? 0) >= 6;
}
export async function registerFailure(email: string) {
  const k = `auth:fail:${normEmail(email)}`;
  await kvSet(k, ((await kvGet<number>(k)) ?? 0) + 1, 15 * 60);
}
