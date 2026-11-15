import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR } from "./storage";

/**
 * Os links de imagem da Meta expiram em alguns dias. Por isso a plataforma guarda
 * uma cópia das capas e serve tudo por /api/img.
 */

const DIR = path.join(DATA_DIR, "img");
const ALLOWED = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;

export function imageKey(id: string) {
  return createHash("sha1").update(id).digest("hex").slice(0, 24);
}

export function isAllowedImageUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && ALLOWED.test(url.hostname);
  } catch {
    return false;
  }
}

export async function readImage(key: string) {
  try {
    const [buf, type] = await Promise.all([fs.readFile(path.join(DIR, key)), fs.readFile(path.join(DIR, `${key}.type`), "utf8")]);
    return { buf, type };
  } catch {
    return null;
  }
}

export async function cacheImage(key: string, url: string) {
  const hit = await readImage(key);
  if (hit) return hit;
  if (!isAllowedImageUrl(url)) return null;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(DIR, { recursive: true });
  await Promise.all([fs.writeFile(path.join(DIR, key), buf), fs.writeFile(path.join(DIR, `${key}.type`), type)]);
  return { buf, type };
}

/** Baixa várias capas em paralelo, sem travar a análise se alguma falhar. */
export async function warmImages(items: { id: string; url: string | null }[]) {
  const queue = items.filter((i): i is { id: string; url: string } => Boolean(i.url));
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const it = queue.shift()!;
      await cacheImage(imageKey(it.id), it.url).catch(() => null);
    }
  });
  await Promise.all(workers);
}
