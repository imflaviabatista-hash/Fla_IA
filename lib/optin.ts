import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR } from "./storage";
import type { Breakdown, MediaFormat, Post, PostInsights, PrivateData, Profile } from "./types";

/**
 * Análise completa com opt-in: o dono do perfil entra com o Instagram e autoriza.
 * Usa o Instagram Login (Business Login for Instagram).
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
 *
 * Os tokens ficam em .data/connections. Em produção, guarde num banco com criptografia.
 */

const DIR = path.join(DATA_DIR, "connections");
const SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"];
const version = () => process.env.IG_GRAPH_VERSION || "v27.0";
const GRAPH = () => `https://graph.instagram.com/${version()}`;

export interface Connection {
  username: string;
  userId: string;
  token: string;
  expiresAt: string;
  connectedAt: string;
  refreshedAt: string;
}

export function optinConfigured() {
  return Boolean(process.env.IG_APP_ID && process.env.IG_APP_SECRET && process.env.APP_URL);
}

const appUrl = () => process.env.APP_URL!.replace(/\/$/, "");
export const redirectUri = () => `${appUrl()}/api/auth/instagram/callback`;
export const inviteUrl = () => `${appUrl()}/conectar/aceite`;

export function newState() {
  return randomBytes(16).toString("hex");
}

export function authorizeUrl(state: string) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("client_id", process.env.IG_APP_ID!);
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPES.join(","));
  u.searchParams.set("state", state);
  u.searchParams.set("enable_fb_login", "0");
  return u.toString();
}

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", ...init });
  const json = await res.json();
  if (!res.ok || json.error) {
    const msg = json.error?.message ?? json.error_message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

/** Troca o código do login por um token de 60 dias e salva a conexão. */
export async function completeLogin(code: string): Promise<Connection> {
  const form = new URLSearchParams({
    client_id: process.env.IG_APP_ID!,
    client_secret: process.env.IG_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
    code,
  });
  const short = await getJson("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
  const shortToken: string = short.access_token ?? short.data?.[0]?.access_token;

  const long = await getJson(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.IG_APP_SECRET}&access_token=${shortToken}`,
  );
  const me = await getJson(`${GRAPH()}/me?fields=user_id,username&access_token=${long.access_token}`);

  const now = new Date();
  const conn: Connection = {
    username: String(me.username).toLowerCase(),
    userId: String(me.user_id ?? me.id),
    token: long.access_token,
    expiresAt: new Date(now.getTime() + (long.expires_in ?? 5_184_000) * 1000).toISOString(),
    connectedAt: now.toISOString(),
    refreshedAt: now.toISOString(),
  };
  await saveConnection(conn);
  return conn;
}

async function saveConnection(conn: Connection) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${conn.username}.json`), JSON.stringify(conn), { mode: 0o600 });
}

export async function getConnection(username: string): Promise<Connection | null> {
  try {
    const conn = JSON.parse(await fs.readFile(path.join(DIR, `${username}.json`), "utf8")) as Connection;
    if (new Date(conn.expiresAt).getTime() < Date.now()) return null;
    // Renova quando faltar menos de 10 dias (a Meta exige token com mais de 24h)
    const left = new Date(conn.expiresAt).getTime() - Date.now();
    const age = Date.now() - new Date(conn.refreshedAt).getTime();
    if (left < 10 * 86_400_000 && age > 86_400_000) {
      try {
        const r = await getJson(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${conn.token}`);
        conn.token = r.access_token;
        conn.expiresAt = new Date(Date.now() + r.expires_in * 1000).toISOString();
        conn.refreshedAt = new Date().toISOString();
        await saveConnection(conn);
      } catch {
        /* segue com o token atual */
      }
    }
    return conn;
  } catch {
    return null;
  }
}

export async function listConnections() {
  try {
    const files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".json"));
    const list = await Promise.all(
      files.map(async (f) => {
        const c = JSON.parse(await fs.readFile(path.join(DIR, f), "utf8")) as Connection;
        return { username: c.username, connectedAt: c.connectedAt, expiresAt: c.expiresAt, active: new Date(c.expiresAt).getTime() > Date.now() };
      }),
    );
    return list.sort((a, b) => b.connectedAt.localeCompare(a.connectedAt));
  } catch {
    return [];
  }
}

export async function removeConnection(username: string) {
  const safe = username.replace(/[^a-z0-9._]/g, "");
  await fs.rm(path.join(DIR, `${safe}.json`), { force: true });
}

/* ------------------------------------------------------------------ */
/* Coleta dos dados internos                                           */
/* ------------------------------------------------------------------ */

interface RawMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  like_count?: number;
  comments_count?: number;
  timestamp: string;
  permalink: string;
  media_url?: string;
  thumbnail_url?: string;
}

function toFormat(m: RawMedia): MediaFormat {
  if (m.media_product_type === "REELS") return "REEL";
  if (m.media_type === "CAROUSEL_ALBUM") return "CAROUSEL";
  if (m.media_type === "VIDEO") return "VIDEO";
  return "IMAGE";
}

type InsightRow = { name: string; values?: { value: number }[]; total_value?: { value: number } };
const metricValue = (rows: InsightRow[], name: string) => {
  const r = rows.find((x) => x.name === name);
  const v = r?.values?.[0]?.value ?? r?.total_value?.value;
  return typeof v === "number" ? v : null;
};

async function mediaInsights(id: string, format: MediaFormat, token: string): Promise<PostInsights | undefined> {
  const isReel = format === "REEL";
  const attempts = isReel
    ? ["reach,views,saved,shares,total_interactions,ig_reels_avg_watch_time", "reach,saved,shares,ig_reels_avg_watch_time", "reach,saved,shares"]
    : ["reach,views,saved,shares,total_interactions", "reach,saved,shares"];
  for (const metrics of attempts) {
    try {
      const j = await getJson(`${GRAPH()}/${id}/insights?metric=${metrics}&access_token=${token}`);
      const rows = j.data as InsightRow[];
      const watch = metricValue(rows, "ig_reels_avg_watch_time");
      return {
        reach: metricValue(rows, "reach"),
        views: metricValue(rows, "views"),
        saved: metricValue(rows, "saved"),
        shares: metricValue(rows, "shares"),
        interactions: metricValue(rows, "total_interactions"),
        avgWatchTimeSec: watch != null ? Math.round(watch / 100) / 10 : null, // a Meta devolve em milissegundos
      };
    } catch {
      /* tenta com menos métricas */
    }
  }
  return undefined;
}

type BreakdownResult = { total_value?: { value?: number; breakdowns?: { results?: { dimension_values: string[]; value: number }[] }[] } };

async function accountBreakdown(token: string, userId: string, query: string): Promise<{ total: number | null; rows: Breakdown[] }> {
  try {
    const j = await getJson(`${GRAPH()}/${userId}/insights?${query}&access_token=${token}`);
    const d = (j.data as BreakdownResult[])?.[0];
    const rows = (d?.total_value?.breakdowns?.[0]?.results ?? []).map((r) => ({ label: r.dimension_values.join(" "), value: r.value }));
    return { total: d?.total_value?.value ?? null, rows };
  } catch {
    return { total: null, rows: [] };
  }
}

export async function fetchOwnedProfile(conn: Connection, maxPosts = 60) {
  const t = conn.token;
  const me = await getJson(
    `${GRAPH()}/me?fields=user_id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count&access_token=${t}`,
  );
  const profile: Profile = {
    username: me.username,
    name: me.name ?? me.username,
    bio: me.biography ?? "",
    website: me.website ?? null,
    avatar: me.profile_picture_url ?? null,
    followers: me.followers_count ?? 0,
    following: me.follows_count ?? 0,
    mediaCount: me.media_count ?? 0,
  };

  const raw: RawMedia[] = [];
  let next: string | null =
    `${GRAPH()}/me/media?fields=id,caption,media_type,media_product_type,like_count,comments_count,timestamp,permalink,media_url,thumbnail_url&limit=50&access_token=${t}`;
  while (next && raw.length < maxPosts) {
    const page = await getJson(next);
    raw.push(...(page.data as RawMedia[]));
    next = page.paging?.next ?? null;
  }

  const posts: Post[] = raw.slice(0, maxPosts).map((m) => ({
    id: m.id,
    caption: m.caption ?? "",
    format: toFormat(m),
    timestamp: m.timestamp,
    likes: m.like_count ?? null,
    comments: m.comments_count ?? null,
    views: null,
    permalink: m.permalink,
    thumbnail: (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ?? m.thumbnail_url ?? null,
  }));

  // insights por post, 6 de cada vez
  const queue = [...posts];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (queue.length) {
        const p = queue.shift()!;
        p.insights = await mediaInsights(p.id, p.format, t);
        if (p.insights?.views != null && (p.format === "REEL" || p.format === "VIDEO")) p.views = p.insights.views;
      }
    }),
  );

  const until = Math.floor(Date.now() / 1000);
  const since = until - 28 * 86_400;
  const uid = conn.userId;
  const [reach, age, gender, city] = await Promise.all([
    accountBreakdown(t, uid, `metric=reach&period=day&metric_type=total_value&breakdown=follow_type&since=${since}&until=${until}`),
    accountBreakdown(t, uid, "metric=follower_demographics&period=lifetime&timeframe=this_month&metric_type=total_value&breakdown=age"),
    accountBreakdown(t, uid, "metric=follower_demographics&period=lifetime&timeframe=this_month&metric_type=total_value&breakdown=gender"),
    accountBreakdown(t, uid, "metric=follower_demographics&period=lifetime&timeframe=this_month&metric_type=total_value&breakdown=city"),
  ]);

  return { profile, posts, account: { reach, age: age.rows, gender: gender.rows, city: city.rows } };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r2 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);

export function computePrivate(
  profile: Profile,
  posts: Post[],
  account: Awaited<ReturnType<typeof fetchOwnedProfile>>["account"],
): PrivateData {
  const withReach = posts.filter((p) => p.insights?.reach);
  const per = (pick: (p: Post) => number | null | undefined) =>
    r2(avg(withReach.map((p) => ((pick(p) ?? 0) / p.insights!.reach!) * 100)));

  const follower = account.reach.rows.find((r) => r.label === "FOLLOWER")?.value ?? null;
  const nonFollower = account.reach.rows.find((r) => r.label === "NON_FOLLOWER")?.value ?? null;
  const known = (follower ?? 0) + (nonFollower ?? 0);
  const avgReach = avg(withReach.map((p) => p.insights!.reach!));
  const watch = posts.map((p) => p.insights?.avgWatchTimeSec).filter((x): x is number => x != null);
  const genderLabel: Record<string, string> = { F: "Mulheres", M: "Homens", U: "Não informado" };

  return {
    periodDays: 28,
    reachTotal: account.reach.total,
    reachFollowers: follower,
    reachNonFollowers: nonFollower,
    nonFollowerShare: known ? r2(((nonFollower ?? 0) / known) * 100) : null,
    avgReach: avgReach != null ? Math.round(avgReach) : null,
    reachPerFollower: avgReach != null ? r2(avgReach / Math.max(profile.followers, 1)) : null,
    likesPerReach: per((p) => p.likes),
    sendsPerReach: per((p) => p.insights?.shares),
    savesPerReach: per((p) => p.insights?.saved),
    avgWatchTimeSec: watch.length ? Math.round(avg(watch)! * 10) / 10 : null,
    demographics: {
      age: account.age.sort((a, b) => a.label.localeCompare(b.label)),
      gender: account.gender.map((g) => ({ ...g, label: genderLabel[g.label] ?? g.label })),
      city: account.city.sort((a, b) => b.value - a.value).slice(0, 6),
    },
  };
}
