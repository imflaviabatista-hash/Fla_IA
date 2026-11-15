import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR } from "./storage";

/**
 * Armazenamento chave-valor.
 * Com Redis (Upstash, criado pela aba Storage da Vercel) os dados ficam guardados de vez.
 * Sem ele, cai em arquivos na pasta de dados (que na Vercel é temporária).
 */

const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const kvPersistent = () => Boolean(url() && token());

async function redis(command: (string | number)[]) {
  const res = await fetch(url()!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok || json.error) throw new Error(`Redis: ${json.error ?? res.status}`);
  return json.result;
}

const fileFor = (key: string) => path.join(DATA_DIR, "kv", `${key.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`);

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    if (kvPersistent()) {
      const raw = (await redis(["GET", key])) as string | null;
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const { value, expires } = JSON.parse(await fs.readFile(fileFor(key), "utf8")) as { value: T; expires: number | null };
    if (expires && expires < Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown, ttlSeconds?: number) {
  if (kvPersistent()) {
    const cmd: (string | number)[] = ["SET", key, JSON.stringify(value)];
    if (ttlSeconds) cmd.push("EX", ttlSeconds);
    await redis(cmd);
    return;
  }
  await fs.mkdir(path.dirname(fileFor(key)), { recursive: true });
  await fs.writeFile(fileFor(key), JSON.stringify({ value, expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null }), {
    mode: 0o600,
  });
}

export async function kvDel(key: string) {
  if (kvPersistent()) {
    await redis(["DEL", key]);
    return;
  }
  await fs.rm(fileFor(key), { force: true });
}
