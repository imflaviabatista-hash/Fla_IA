import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR } from "./storage";
import { hookType } from "./ai";
import { fetchHashtagTop, fetchInstagramProfile, instagramConfigured } from "./instagram";
import { warmImages } from "./media";
import { firstLine } from "./metrics";
import type { MediaFormat, Post } from "./types";

/* ---------- Tipos ---------- */

export interface TrendCategory {
  id: string;
  nome: string;
  hashtags: string[];
  perfis: string[];
}

export interface TrendItem {
  id: string;
  origem: "perfil" | "hashtag";
  autor: string | null;
  seguidores: number | null;
  format: MediaFormat;
  hook: string;
  tipoHook: string;
  caption: string;
  timestamp: string;
  likes: number | null;
  comments: number | null;
  views: number | null;
  permalink: string;
  thumbnail: string | null;
  furo: number | null; // views / seguidores
  metrica: string; // texto da métrica principal
  hashtag: string | null;
}

export interface TrendResult {
  categoria: TrendCategory;
  source: "instagram" | "demo";
  updatedAt: string;
  items: TrendItem[];
  padroes: {
    formatos: { format: MediaFormat; share: number }[];
    hooks: { tipo: string; count: number }[];
    furoMedio: number | null;
  };
  avisos: string[];
}

/* ---------- Categorias ---------- */

const DATA = DATA_DIR;
const CAT_FILE = path.join(DATA, "categories.json");
const TREND_DIR = path.join(DATA, "trends");
const CACHE_HOURS = 6;
const WINDOW_DAYS = 30;

export const DEFAULT_CATEGORIES: TrendCategory[] = [
  { id: "moda", nome: "Moda", hashtags: ["moda", "lookdodia"], perfis: [] },
  { id: "beleza", nome: "Beleza", hashtags: ["maquiagem", "skincare"], perfis: [] },
  { id: "fitness", nome: "Fitness", hashtags: ["treino", "vidasaudavel"], perfis: [] },
  { id: "gastronomia", nome: "Gastronomia", hashtags: ["receitas", "receitafacil"], perfis: [] },
  { id: "financas", nome: "Finanças", hashtags: ["educacaofinanceira", "investimentos"], perfis: [] },
  { id: "maternidade", nome: "Maternidade", hashtags: ["maternidade", "maedeprimeiraviagem"], perfis: [] },
  { id: "casa", nome: "Casa e organização", hashtags: ["decoracao", "organizacao"], perfis: [] },
  { id: "viagem", nome: "Viagem", hashtags: ["viagem", "dicasdeviagem"], perfis: [] },
  { id: "humor", nome: "Humor", hashtags: ["humor", "memesbr"], perfis: [] },
  { id: "negocios", nome: "Negócios", hashtags: ["empreendedorismo", "marketingdigital"], perfis: [] },
];

export function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export async function getCategories(): Promise<TrendCategory[]> {
  try {
    return JSON.parse(await fs.readFile(CAT_FILE, "utf8"));
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function saveCategory(input: { nome: string; hashtags?: string[]; perfis?: string[] }) {
  const cats = await getCategories();
  const id = slug(input.nome);
  if (!id) throw new Error("Dá um nome pra categoria.");
  const clean = (xs: string[] | undefined, re: RegExp) =>
    [...new Set((xs ?? []).map((x) => x.trim().replace(re, "").toLowerCase()).filter(Boolean))];
  const cat: TrendCategory = {
    id,
    nome: input.nome.trim(),
    hashtags: clean(input.hashtags, /^#/).map(slug).filter(Boolean),
    perfis: clean(input.perfis, /^@/),
  };
  if (!cat.hashtags.length && !cat.perfis.length) cat.hashtags = [id];
  const next = [...cats.filter((c) => c.id !== id), cat];
  await fs.mkdir(DATA, { recursive: true });
  await fs.writeFile(CAT_FILE, JSON.stringify(next, null, 2));
  await fs.rm(path.join(TREND_DIR, `${id}.json`), { force: true });
  return cat;
}

/* ---------- Montagem do ranking ---------- */

function toItem(p: Post, extra: Partial<TrendItem>): TrendItem {
  const hook = firstLine(p.caption);
  return {
    id: p.id,
    origem: "perfil",
    autor: null,
    seguidores: null,
    format: p.format,
    hook,
    tipoHook: hookType(hook).tipo,
    caption: p.caption,
    timestamp: p.timestamp,
    likes: p.likes,
    comments: p.comments,
    views: p.views,
    permalink: p.permalink,
    thumbnail: p.thumbnail,
    furo: null,
    metrica: "",
    hashtag: null,
    ...extra,
  };
}

function patterns(items: TrendItem[]): TrendResult["padroes"] {
  const n = Math.max(items.length, 1);
  const fmt = new Map<MediaFormat, number>();
  const hk = new Map<string, number>();
  items.forEach((i) => {
    fmt.set(i.format, (fmt.get(i.format) ?? 0) + 1);
    hk.set(i.tipoHook, (hk.get(i.tipoHook) ?? 0) + 1);
  });
  const furos = items.map((i) => i.furo).filter((x): x is number => x != null);
  return {
    formatos: [...fmt.entries()].map(([format, c]) => ({ format, share: Math.round((c / n) * 100) })).sort((a, b) => b.share - a.share),
    hooks: [...hk.entries()].map(([tipo, count]) => ({ tipo, count })).sort((a, b) => b.count - a.count),
    furoMedio: furos.length ? Math.round((furos.reduce((a, b) => a + b, 0) / furos.length) * 10) / 10 : null,
  };
}

async function liveTrends(cat: TrendCategory): Promise<{ items: TrendItem[]; avisos: string[] }> {
  const avisos: string[] = [];
  const since = Date.now() - WINDOW_DAYS * 86_400_000;
  const fromProfiles: TrendItem[] = [];

  for (const handle of cat.perfis) {
    try {
      const { profile, posts } = await fetchInstagramProfile(handle, 30);
      const followers = Math.max(profile.followers, 1);
      posts
        .filter((p) => p.views != null && new Date(p.timestamp).getTime() >= since)
        .forEach((p) => {
          const furo = p.views! / followers;
          fromProfiles.push(
            toItem(p, {
              origem: "perfil",
              autor: profile.username,
              seguidores: profile.followers,
              furo: Math.round(furo * 10) / 10,
              metrica: `${(Math.round(furo * 10) / 10).toLocaleString("pt-BR")}x os seguidores em views`,
            }),
          );
        });
    } catch (e) {
      avisos.push(`@${handle}: ${e instanceof Error ? e.message : "erro"}`);
    }
  }

  const fromTags: TrendItem[] = [];
  for (const tag of cat.hashtags) {
    try {
      const posts = await fetchHashtagTop(tag);
      posts
        .filter((p) => new Date(p.timestamp).getTime() >= since)
        .forEach((p) =>
          fromTags.push(
            toItem(p, {
              origem: "hashtag",
              hashtag: tag,
              metrica: `Top da #${tag} · ${((p.likes ?? 0) + (p.comments ?? 0)).toLocaleString("pt-BR")} interações`,
            }),
          ),
        );
    } catch (e) {
      avisos.push(e instanceof Error ? e.message : `#${tag}: erro`);
    }
  }

  // Primeiro o que comprovadamente furou a bolha (views > seguidores), depois o topo das hashtags
  const furou = fromProfiles.filter((i) => (i.furo ?? 0) >= 1).sort((a, b) => b.furo! - a.furo!);
  const tags = [...new Map(fromTags.map((t) => [t.id, t])).values()].sort(
    (a, b) => (b.likes ?? 0) + (b.comments ?? 0) - ((a.likes ?? 0) + (a.comments ?? 0)),
  );
  return { items: [...furou, ...tags].slice(0, 20), avisos };
}

/* ---------- Demonstração ---------- */

const DEMO_HOOKS = [
  "Ninguém te conta isso sobre {x}",
  "Pare de fazer isso se você gosta de {x}",
  "3 erros de {x} que todo mundo comete",
  "Testei por 30 dias e olha o resultado",
  "Isso custou R$ 20 e mudou tudo",
  "Você tá fazendo {x} do jeito errado",
  "Como eu faço {x} em 5 minutos",
  "Minha rotina de {x} sem complicação",
  "O que ninguém fala sobre {x}?",
  "Descobri o truque que os profissionais de {x} usam",
];

function demoTrends(cat: TrendCategory): TrendItem[] {
  let s = [...cat.id].reduce((a, c) => a + c.charCodeAt(0), 7);
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const formats: MediaFormat[] = ["REEL", "REEL", "REEL", "CAROUSEL", "REEL", "IMAGE"];
  const x = cat.nome.toLowerCase();

  return Array.from({ length: 20 }, (_, i) => {
    const followers = Math.round(4000 + rand() * 180_000);
    const format = formats[Math.floor(rand() * formats.length)];
    const furo = Math.round((12 - i * 0.5 + rand() * 1.5) * 10) / 10;
    const views = format === "REEL" ? Math.round(followers * furo) : null;
    const hook = DEMO_HOOKS[Math.floor(rand() * DEMO_HOOKS.length)].replace("{x}", x);
    const eng = Math.round((views ?? followers * 3) * (0.03 + rand() * 0.04));
    const p: Post = {
      id: `demo_${cat.id}_${i}`,
      caption: `${hook}\n\nConteúdo de demonstração da categoria ${cat.nome}.`,
      format,
      timestamp: new Date(Date.now() - rand() * WINDOW_DAYS * 86_400_000).toISOString(),
      likes: Math.round(eng * 0.94),
      comments: Math.round(eng * 0.06),
      views,
      permalink: "https://www.instagram.com/",
      thumbnail: null,
    };
    return toItem(p, {
      origem: views ? "perfil" : "hashtag",
      autor: views ? `criador.demo${i + 1}` : null,
      seguidores: views ? followers : null,
      furo: views ? furo : null,
      hashtag: views ? null : cat.hashtags[0] ?? cat.id,
      metrica: views
        ? `${furo.toLocaleString("pt-BR")}x os seguidores em views`
        : `Top da #${cat.hashtags[0] ?? cat.id} · ${eng.toLocaleString("pt-BR")} interações`,
    });
  }).sort((a, b) => (b.furo ?? 0) - (a.furo ?? 0));
}

/* ---------- Entrada principal ---------- */

export async function getTrends(categoryId: string, refresh = false): Promise<TrendResult> {
  const cats = await getCategories();
  const cat = cats.find((c) => c.id === categoryId);
  if (!cat) throw new Error("Categoria não encontrada.");

  const file = path.join(TREND_DIR, `${cat.id}.json`);
  if (!refresh) {
    try {
      const cached = JSON.parse(await fs.readFile(file, "utf8")) as TrendResult;
      const fresh = Date.now() - new Date(cached.updatedAt).getTime() < CACHE_HOURS * 3_600_000;
      if (fresh && cached.source === (instagramConfigured() ? "instagram" : "demo")) return cached;
    } catch {
      /* sem cache */
    }
  }

  let items: TrendItem[];
  let avisos: string[] = [];
  let source: TrendResult["source"];
  if (instagramConfigured()) {
    source = "instagram";
    ({ items, avisos } = await liveTrends(cat));
    if (!cat.perfis.length)
      avisos.unshift("Essa categoria ainda não tem perfis de referência. Adiciona alguns pra medir quem furou a bolha de verdade (views vs. seguidores).");
  } else {
    source = "demo";
    items = demoTrends(cat);
    avisos = ["Dados de demonstração. Conecta a API da Meta pra ver as trends reais."];
  }

  await warmImages(items.map((i) => ({ id: i.id, url: i.thumbnail })));

  const result: TrendResult = { categoria: cat, source, updatedAt: new Date().toISOString(), items, padroes: patterns(items), avisos };
  await fs.mkdir(TREND_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(result));
  return result;
}
