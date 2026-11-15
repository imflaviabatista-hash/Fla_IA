/**
 * Sessão assinada (HMAC-SHA256) num cookie. Usa Web Crypto, então funciona
 * tanto no middleware quanto nas rotas da API.
 */

export const SESSION_COOKIE = "perfilab_session";
export const SESSION_DAYS = 30;

export interface Session {
  email: string;
  name: string;
  role: "admin" | "membro";
  exp: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Segredo da sessão: AUTH_SECRET, ou derivado do token do Redis / senha do admin. */
function secretMaterial() {
  const base =
    process.env.AUTH_SECRET ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.ADMIN_PASSWORD ||
    "";
  return base ? `perfilab-session:${base}` : "";
}

export function authConfigured() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && secretMaterial());
}

async function key() {
  return crypto.subtle.importKey("raw", enc.encode(secretMaterial()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSession(data: Omit<Session, "exp">) {
  const payload: Session = { ...data, exp: Date.now() + SESSION_DAYS * 86_400_000 };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token || !secretMaterial()) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Session;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}
