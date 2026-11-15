import type { MediaFormat, Post, Profile } from "./types";

/**
 * Busca dados públicos de um perfil pela API oficial da Meta (Business Discovery).
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery
 *
 * Só funciona com perfis comerciais ou de criador. Não traz alcance, salvamentos,
 * compartilhamentos nem tempo assistido de outros perfis.
 */

const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "like_count",
  "comments_count",
  "view_count",
  "timestamp",
  "permalink",
  "media_url",
  "thumbnail_url",
].join(",");

const PROFILE_FIELDS = [
  "username",
  "name",
  "biography",
  "website",
  "profile_picture_url",
  "followers_count",
  "follows_count",
  "media_count",
].join(",");

export class InstagramError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export function instagramConfigured() {
  return Boolean(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN);
}

interface RawMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  like_count?: number;
  comments_count?: number;
  view_count?: number;
  timestamp: string;
  permalink: string;
  media_url?: string;
  thumbnail_url?: string;
}

interface RawDiscovery {
  username: string;
  name?: string;
  biography?: string;
  website?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  media?: { data: RawMedia[]; paging?: { cursors?: { after?: string }; next?: string } };
}

function toFormat(m: RawMedia): MediaFormat {
  if (m.media_product_type === "REELS") return "REEL";
  if (m.media_type === "CAROUSEL_ALBUM") return "CAROUSEL";
  if (m.media_type === "VIDEO") return "VIDEO";
  return "IMAGE";
}

function toPost(m: RawMedia): Post {
  const isVideo = m.media_type === "VIDEO";
  return {
    id: m.id,
    caption: m.caption ?? "",
    format: toFormat(m),
    timestamp: m.timestamp,
    likes: typeof m.like_count === "number" ? m.like_count : null,
    comments: typeof m.comments_count === "number" ? m.comments_count : null,
    views: typeof m.view_count === "number" ? m.view_count : null,
    permalink: m.permalink,
    thumbnail: (isVideo ? m.thumbnail_url : m.media_url) ?? m.thumbnail_url ?? null,
  };
}

async function graph(path: string): Promise<RawDiscovery> {
  const version = process.env.IG_GRAPH_VERSION || "v27.0";
  const url = new URL(`https://graph.facebook.com/${version}/${process.env.IG_USER_ID}`);
  url.searchParams.set("fields", path);
  url.searchParams.set("access_token", process.env.IG_ACCESS_TOKEN!);

  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as {
    business_discovery?: RawDiscovery;
    error?: { message: string; code: number; error_subcode?: number };
  };

  if (json.error) {
    const { code, message } = json.error;
    if (code === 190) throw new InstagramError("O token da Meta expirou ou é inválido. Gere um novo e atualize o .env.", 401);
    if (code === 4 || code === 17 || code === 32 || code === 613)
      throw new InstagramError("Limite de chamadas da Meta atingido. Espera uns minutos e tenta de novo.", 429);
    if (code === 110 || code === 100)
      throw new InstagramError(
        "Não achei esse perfil. Confere o @ e se ele é uma conta comercial ou de criador (contas pessoais não aparecem na API).",
        404,
      );
    throw new InstagramError(`A Meta respondeu com erro: ${message}`, 502);
  }
  if (!json.business_discovery) throw new InstagramError("A Meta não retornou dados desse perfil.", 404);
  return json.business_discovery;
}

export async function fetchInstagramProfile(
  handle: string,
  maxPosts = 60,
): Promise<{ profile: Profile; posts: Post[] }> {
  const username = handle.replace(/[^a-zA-Z0-9._]/g, "");
  const pageSize = Math.min(50, maxPosts);

  const first = await graph(
    `business_discovery.username(${username}){${PROFILE_FIELDS},media.limit(${pageSize}){${MEDIA_FIELDS}}}`,
  );

  const raw: RawMedia[] = [...(first.media?.data ?? [])];
  let after = first.media?.paging?.cursors?.after;
  let hasNext = Boolean(first.media?.paging?.next);

  while (hasNext && after && raw.length < maxPosts) {
    const page = await graph(
      `business_discovery.username(${username}){media.after(${after}).limit(${pageSize}){${MEDIA_FIELDS}}}`,
    );
    raw.push(...(page.media?.data ?? []));
    after = page.media?.paging?.cursors?.after;
    hasNext = Boolean(page.media?.paging?.next);
  }

  const profile: Profile = {
    username: first.username,
    name: first.name ?? first.username,
    bio: first.biography ?? "",
    website: first.website ?? null,
    avatar: first.profile_picture_url ?? null,
    followers: first.followers_count ?? 0,
    following: first.follows_count ?? 0,
    mediaCount: first.media_count ?? raw.length,
  };

  return { profile, posts: raw.slice(0, maxPosts).map(toPost) };
}

/**
 * Posts mais populares de uma hashtag (Hashtag Search da Meta).
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/hashtag-search
 * Limite da Meta: 30 hashtags diferentes a cada 7 dias por conta. Precisa do recurso
 * "Instagram Public Content Access" aprovado no app.
 * A Meta não informa o autor nem as views desses posts.
 */
export async function fetchHashtagTop(tag: string, limit = 30): Promise<Post[]> {
  const version = process.env.IG_GRAPH_VERSION || "v27.0";
  const base = `https://graph.facebook.com/${version}`;
  const user = process.env.IG_USER_ID!;
  const token = process.env.IG_ACCESS_TOKEN!;
  const q = tag.replace(/^#/, "").toLowerCase();

  const search = await fetch(`${base}/ig_hashtag_search?user_id=${user}&q=${encodeURIComponent(q)}&access_token=${token}`, {
    cache: "no-store",
  }).then((r) => r.json());
  if (search.error) throw new InstagramError(`Hashtag #${q}: ${search.error.message}`, 502);
  const id = search.data?.[0]?.id;
  if (!id) return [];

  const fields = "id,caption,media_type,media_product_type,like_count,comments_count,permalink,timestamp,media_url";
  const top = await fetch(`${base}/${id}/top_media?user_id=${user}&fields=${fields}&limit=${limit}&access_token=${token}`, {
    cache: "no-store",
  }).then((r) => r.json());
  if (top.error) throw new InstagramError(`Hashtag #${q}: ${top.error.message}`, 502);
  return ((top.data ?? []) as RawMedia[]).map(toPost);
}
