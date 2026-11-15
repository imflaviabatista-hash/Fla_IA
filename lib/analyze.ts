import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR } from "./storage";
import { analyzeQualitative } from "./ai";
import { computeBubble } from "./algorithm";
import { demoAccount, demoData, isDemoHandle } from "./demo";
import { InstagramError, fetchInstagramProfile, instagramConfigured } from "./instagram";
import { warmImages } from "./media";
import { computeQuant } from "./metrics";
import { computePrivate, fetchOwnedProfile, getConnection } from "./optin";
import type { Analysis, PrivateData } from "./types";

const DIR = path.join(DATA_DIR, "analyses");

export function normalizeHandle(input: string) {
  const s = input.trim();
  const fromUrl = s.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  return (fromUrl ? fromUrl[1] : s).replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();
}

export async function readCached(handle: string): Promise<Analysis | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, `${handle}.json`), "utf8")) as Analysis;
  } catch {
    return null;
  }
}

export async function listCached() {
  try {
    const files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".json"));
    const items = await Promise.all(
      files.map(async (f) => {
        const a = JSON.parse(await fs.readFile(path.join(DIR, f), "utf8")) as Analysis;
        return {
          handle: a.handle,
          name: a.profile.name,
          avatar: a.profile.avatar,
          followers: a.profile.followers,
          bubble: a.bubble.profileScore,
          source: a.source,
          createdAt: a.createdAt,
        };
      }),
    );
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function runAnalysis(rawHandle: string): Promise<Analysis> {
  const handle = normalizeHandle(rawHandle);
  if (!handle) throw new InstagramError("Cola um @ ou o link do perfil.", 400);

  const warnings: string[] = [];
  let source: Analysis["source"];
  let data;
  let privado: PrivateData | null = null;
  const conn = isDemoHandle(handle) ? null : await getConnection(handle);

  if (conn) {
    // Análise completa: o dono do perfil autorizou (opt-in)
    source = "optin";
    const owned = await fetchOwnedProfile(conn);
    data = { profile: owned.profile, posts: owned.posts };
    privado = computePrivate(owned.profile, owned.posts, owned.account);
  } else if (isDemoHandle(handle)) {
    source = "demo";
    data = demoData(handle);
    if (handle.includes("completo")) privado = computePrivate(data.profile, data.posts, demoAccount());
  } else if (!instagramConfigured()) {
    throw new InstagramError(
      "A conexão com a Meta ainda não foi configurada. Preenche IG_USER_ID e IG_ACCESS_TOKEN no .env, ou testa com @demo.",
      503,
    );
  } else {
    source = "instagram";
    data = await fetchInstagramProfile(handle);
  }

  const { profile, posts } = data;
  if (!posts.length) throw new InstagramError("Esse perfil não tem posts públicos pra analisar.", 404);

  await warmImages([
    { id: `avatar_${profile.username}`, url: profile.avatar },
    ...posts.map((p) => ({ id: p.id, url: p.thumbnail })),
  ]);

  const quant = computeQuant(profile, posts);
  if (quant.hiddenLikesShare > 30)
    warnings.push(`${quant.hiddenLikesShare}% dos posts escondem as curtidas. O engajamento desses posts conta só os comentários.`);

  const { qual, warning } = await analyzeQualitative(profile, posts, quant);
  if (warning) warnings.push(warning);

  const bubble = computeBubble(posts, quant, qual, profile.followers);

  const analysis: Analysis = {
    handle,
    source,
    createdAt: new Date().toISOString(),
    profile,
    posts,
    quant,
    qual,
    bubble,
    privado,
    warnings,
  };

  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${handle}.json`), JSON.stringify(analysis));
  return analysis;
}
