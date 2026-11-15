import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { ALGORITHM_RULES } from "./algorithm";
import { firstLine } from "./metrics";
import type { Post, Profile, Quantitative, Qualitative, QualPost } from "./types";

/* ------------------------------------------------------------------ */
/* Schema da resposta (structured outputs)                             */
/* ------------------------------------------------------------------ */

const QualSchema = z.object({
  resumo: z.string(),
  nicho: z.object({
    principal: z.string(),
    subnichos: z.array(z.string()),
    clareza: z.number(),
    comentario: z.string(),
  }),
  posicionamento: z.object({
    proposta: z.string(),
    publico: z.string(),
    tom: z.string(),
    diferenciais: z.array(z.string()),
    pontosFracos: z.array(z.string()),
  }),
  temas: z.array(
    z.object({
      nome: z.string(),
      percentual: z.number(),
      desempenho: z.enum(["acima", "na média", "abaixo"]),
      comentario: z.string(),
    }),
  ),
  narrativas: z.array(z.object({ nome: z.string(), descricao: z.string() })),
  hooks: z.object({
    padroes: z.array(z.object({ tipo: z.string(), exemplo: z.string(), efetividade: z.string() })),
    nota: z.number(),
    sugestoes: z.array(z.string()),
  }),
  qualidade: z.object({
    nota: z.number(),
    consistencia: z.string(),
    legendas: z.string(),
    ctas: z.string(),
    comentario: z.string(),
  }),
  posts: z.array(
    z.object({
      id: z.string(),
      tema: z.string(),
      hook: z.string(),
      tipoHook: z.string(),
      forcaHook: z.number(),
      potencialEnvio: z.number(),
      riscoRecomendacao: z.string().nullable(),
      leitura: z.string(),
    }),
  ),
  furarBolha: z.object({
    diagnostico: z.string(),
    oQueFunciona: z.array(z.string()),
    oQueEvitar: z.array(z.string()),
    ideias: z.array(z.object({ titulo: z.string(), formato: z.string(), hook: z.string(), porque: z.string() })),
  }),
  recomendacoes: z.array(
    z.object({ titulo: z.string(), detalhe: z.string(), prioridade: z.enum(["alta", "média", "baixa"]) }),
  ),
});

const SYSTEM = `Você é uma estrategista de conteúdo e marketing de influência que analisa perfis do Instagram.

Escreva em português do Brasil, num tom simples, direto e amigável, como uma amiga que entende do assunto explicando pra outra. Frases curtas. Nada de linguagem corporativa, travessões ou clichês como "potencialize", "alavanque" ou "mergulhe". Seja honesta: se algo não funciona, fale e explique o motivo.

Baseie qualquer afirmação sobre o algoritmo só nas regras oficiais abaixo. Não invente sinais que a Meta não confirmou. Lembre que de fora não dá pra ver alcance, salvamentos, envios ou tempo assistido, então quando estimar algo, deixe claro que é estimativa.

Regras do algoritmo (fontes da Meta):
${ALGORITHM_RULES.map((r) => `- ${r.titulo}: ${r.oQueDiz}`).join("\n")}

Como preencher:
- nicho.clareza, hooks.nota e qualidade.nota vão de 0 a 10.
- temas: de 3 a 7 temas, com o percentual aproximado de posts de cada um (soma perto de 100). "desempenho" compara o engajamento dos posts daquele tema com a média do perfil.
- posts: um item pra CADA post recebido, usando exatamente o mesmo id. forcaHook (0 a 10) estima o quanto a abertura segura a pessoa nos primeiros segundos. potencialEnvio (0 a 10) estima a chance de alguém mandar o post por DM pra um amigo. riscoRecomendacao fica null, a não ser que o post tenha algo que as diretrizes de recomendação penalizam (isca de engajamento, repost/conteúdo não original, baixa qualidade, tema sensível). "leitura" explica em uma frase por que o post foi bem ou mal.
- furarBolha.ideias: de 3 a 5 ideias de conteúdo concretas pra esse perfil chegar em gente nova, com o hook já escrito.
- recomendacoes: de 4 a 6, ordenadas da mais importante pra menos.`;

function buildPrompt(profile: Profile, posts: Post[], quant: Quantitative) {
  const lines = posts.map((p) => {
    const m = quant.posts[p.id];
    return JSON.stringify({
      id: p.id,
      formato: p.format,
      data: p.timestamp.slice(0, 10),
      curtidas: p.likes,
      comentarios: p.comments,
      views: p.views,
      engajamento_pct: m.engagementRate,
      vs_mediana: m.relativeToMedian,
      views_por_seguidor: m.viewsPerFollower,
      ...(p.insights
        ? {
            alcance: p.insights.reach,
            salvamentos: p.insights.saved,
            envios: p.insights.shares,
            tempo_medio_assistido_s: p.insights.avgWatchTimeSec,
          }
        : {}),
      legenda: p.caption.slice(0, 900),
    });
  });

  return `Perfil: @${profile.username} (${profile.name})
Bio: ${profile.bio || "(sem bio)"}
Seguidores: ${profile.followers}
Posts analisados: ${quant.postsAnalyzed} em ${quant.periodDays} dias (${quant.postsPerWeek} por semana)
Engajamento médio: ${quant.avgEngagement}% | mediana: ${quant.medianEngagement}%
${posts.some((p) => p.insights) ? "Dados internos autorizados pelo dono do perfil (opt-in): alcance, salvamentos, envios e tempo assistido são reais, não estimativas.\n" : ""}Formatos: ${quant.byFormat.map((f) => `${f.format} ${f.count} posts, ${f.avgEngagement}% de engajamento${f.avgViewsPerFollower != null ? `, views/seguidor ${f.avgViewsPerFollower}` : ""}`).join("; ")}

Posts (um JSON por linha):
${lines.join("\n")}`;
}

async function loadImages(posts: Post[], quant: Quantitative) {
  const top = [...posts]
    .filter((p) => p.thumbnail)
    .sort((a, b) => quant.posts[b.id].engagementRate - quant.posts[a.id].engagementRate)
    .slice(0, 6);

  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const p of top) {
    try {
      const res = await fetch(p.thumbnail!, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "image/jpeg";
      if (!/image\/(jpeg|png|webp|gif)/.test(type)) continue;
      const data = Buffer.from(await res.arrayBuffer()).toString("base64");
      blocks.push({ type: "text", text: `Capa do post ${p.id}:` });
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: type.split(";")[0] as "image/jpeg", data },
      });
    } catch {
      /* imagem é opcional */
    }
  }
  return blocks;
}

export function claudeConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

const clamp10 = (n: number) => Math.max(0, Math.min(10, Math.round(n * 10) / 10));

const SCHEMA_TEXT = JSON.stringify(z.toJSONSchema(QualSchema));

/** Pega o JSON da resposta, mesmo se vier dentro de um bloco de código. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(raw);
}

async function claudeAnalysis(profile: Profile, posts: Post[], quant: Quantitative): Promise<Qualitative> {
  const client = new Anthropic({ timeout: 5 * 60 * 1000 });
  const images = await loadImages(posts, quant);

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: [
        ...images,
        {
          type: "text",
          text: `${buildPrompt(profile, posts, quant)}

Responda só com um objeto JSON válido, sem texto antes ou depois, seguindo exatamente este JSON Schema:
${SCHEMA_TEXT}`,
        },
      ],
    },
  ];

  // até 2 tentativas: se a resposta vier fora do formato, a IA recebe o erro e corrige
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.beta.messages
      .stream({
        model: "claude-opus-5-5",
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "high" },
        system: SYSTEM,
        messages,
      })
      .finalMessage();

    if (response.stop_reason === "refusal") throw new Error("A IA não conseguiu analisar esse perfil.");
    if (response.stop_reason === "max_tokens") throw new Error("A resposta da IA ficou grande demais.");

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    let problem: string;
    try {
      const parsed = QualSchema.safeParse(extractJson(text));
      if (parsed.success) {
        const out = parsed.data;
        return {
          engine: "claude",
          ...out,
          nicho: { ...out.nicho, clareza: clamp10(out.nicho.clareza) },
          hooks: { ...out.hooks, nota: clamp10(out.hooks.nota) },
          qualidade: { ...out.qualidade, nota: clamp10(out.qualidade.nota) },
          posts: out.posts.map((p) => ({ ...p, forcaHook: clamp10(p.forcaHook), potencialEnvio: clamp10(p.potencialEnvio) })),
        };
      }
      problem = parsed.error.issues
        .slice(0, 8)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    } catch (e) {
      problem = `JSON inválido (${e instanceof Error ? e.message : "erro"})`;
    }

    messages.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlockParam[] });
    messages.push({
      role: "user",
      content: `A resposta não seguiu o schema: ${problem}. Mande o JSON completo de novo, corrigido, sem nenhum texto fora dele.`,
    });
  }
  throw new Error("A IA respondeu num formato inesperado.");
}

/* ------------------------------------------------------------------ */
/* Análise básica (sem IA), usada quando não tem chave da Anthropic   */
/* ------------------------------------------------------------------ */

const STOP = new Set(
  "a o e de da do das dos em no na nos nas um uma pra para por com que se não nao mais muito isso esse essa aqui como mas meu minha seu sua você voce eu ele ela foi ser tem ter tá ta vai sobre quem qual quando onde todo toda hoje dia dias depois antes mesmo ainda porque também tambem bem só so já ja até ate sem lá la me te nos vocês voces assim então entao fazer fiz faz cada sempre nunca coisa coisas pode posso quer quero era são sao está estou estão".split(
    " ",
  ),
);

export function hookType(hook: string): { tipo: string; bonus: number } {
  const h = hook.toLowerCase();
  if (/ningu[eé]m (te )?(conta|fala)|segredo|descobri|ningu[eé]m sabe/.test(h)) return { tipo: "Curiosidade", bonus: 3 };
  if (/^(pare|n[aã]o |nunca|evite|voc[eê] (t[aá]|est[aá])|chega de)/.test(h)) return { tipo: "Alerta / quebra de padrão", bonus: 3 };
  if (/r\$|\d+ ?(dias|meses|kg|reais)|economiz|resultado|antes e depois|custou/.test(h)) return { tipo: "Resultado / prova", bonus: 3 };
  if (/^\d|\b\d+ (dicas|erros|h[aá]bitos|passos|coisas|formas|jeitos|motivos)/.test(h)) return { tipo: "Lista", bonus: 2 };
  if (/\?/.test(h)) return { tipo: "Pergunta", bonus: 2 };
  if (/^(minha|meu|arruma comigo|vlog|um dia|rotina)/.test(h)) return { tipo: "Pessoal / bastidor", bonus: 1 };
  if (/^(como|o que|por que|porque)/.test(h)) return { tipo: "Tutorial", bonus: 2 };
  return { tipo: "Declaração", bonus: 0 };
}

function basicAnalysis(profile: Profile, posts: Post[], quant: Quantitative): Qualitative {
  // Temas por palavras e hashtags mais frequentes
  const counts = new Map<string, Set<string>>();
  for (const p of posts) {
    const words = new Set(
      (p.caption.toLowerCase().match(/#?[\p{L}]{4,}/gu) ?? []).map((w) => w.replace(/^#/, "")).filter((w) => !STOP.has(w)),
    );
    words.forEach((w) => counts.set(w, (counts.get(w) ?? new Set()).add(p.id)));
  }
  const topWords = [...counts.entries()]
    .filter(([, ids]) => ids.size >= 2)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 6);

  const avg = quant.avgEngagement || 0.0001;
  const temas = topWords.map(([w, ids]) => {
    const er = [...ids].reduce((a, id) => a + quant.posts[id].engagementRate, 0) / ids.size;
    const rel = er / avg;
    return {
      nome: w.charAt(0).toUpperCase() + w.slice(1),
      percentual: Math.round((ids.size / posts.length) * 100),
      desempenho: (rel > 1.15 ? "acima" : rel < 0.85 ? "abaixo" : "na média") as "acima" | "na média" | "abaixo",
      comentario: `Aparece em ${ids.size} posts, com engajamento ${rel.toFixed(1)}x a média.`,
    };
  });

  const qualPosts: QualPost[] = posts.map((p) => {
    const hook = firstLine(p.caption);
    const { tipo, bonus } = hookType(hook);
    const lower = p.caption.toLowerCase();
    const sendCta = /mand[ae] (pra|para)|envi[ae] (pra|para)|marc[ae] (algu[eé]m|quem|aquela|sua|seu)/.test(lower);
    const useful = ["Lista", "Resultado / prova", "Alerta / quebra de padrão", "Tutorial", "Curiosidade"].includes(tipo);
    let risco: string | null = null;
    if (/coment[ae] ["“]?[A-ZÁÉÍÓÚ]{3,}|coment[ae] (sim|eu quero|quero)/.test(p.caption))
      risco = "Pedir pra comentar uma palavra pode ser lido como isca de engajamento.";
    if (/\brepost\b|via @|cr[eé]ditos?:/i.test(p.caption)) risco = "Parece repost. Conteúdo não original é menos recomendado.";
    const m = quant.posts[p.id];
    return {
      id: p.id,
      tema: temas.find((t) => lower.includes(t.nome.toLowerCase()))?.nome ?? "Outros",
      hook,
      tipoHook: tipo,
      forcaHook: clamp10(4 + bonus + (hook.length > 0 && hook.length <= 70 ? 1 : 0)),
      potencialEnvio: clamp10(3 + (sendCta ? 3 : 0) + (useful ? 2 : 0) + (m.relativeToMedian >= 2 ? 1 : 0)),
      riscoRecomendacao: risco,
      leitura:
        m.relativeToMedian >= 2
          ? "Foi bem acima da média do perfil."
          : m.relativeToMedian < 0.6
            ? "Ficou abaixo da média do perfil."
            : "Ficou dentro da média do perfil.",
    };
  });

  const byType = new Map<string, { ers: number[]; exemplo: string }>();
  for (const q of qualPosts) {
    const e = byType.get(q.tipoHook) ?? { ers: [], exemplo: q.hook };
    e.ers.push(quant.posts[q.id].engagementRate);
    byType.set(q.tipoHook, e);
  }
  const padroes = [...byType.entries()]
    .map(([tipo, v]) => ({ tipo, er: v.ers.reduce((a, b) => a + b, 0) / v.ers.length, n: v.ers.length, exemplo: v.exemplo }))
    .sort((a, b) => b.er - a.er)
    .map((p) => ({
      tipo: p.tipo,
      exemplo: p.exemplo,
      efetividade: `${p.n} posts, ${p.er.toFixed(2)}% de engajamento médio (${(p.er / avg).toFixed(1)}x a média).`,
    }));

  const best = padroes[0]?.tipo ?? "Declaração";
  const reel = quant.byFormat.find((f) => f.format === "REEL");
  const reach = quant.reelsReachRatio;

  return {
    engine: "basico",
    resumo: `Análise automática básica de @${profile.username}. Pra ter a leitura completa de nicho, posicionamento e narrativa, conecta a chave da Anthropic.`,
    nicho: {
      principal: temas[0]?.nome ?? "Não identificado",
      subnichos: temas.slice(1, 4).map((t) => t.nome),
      clareza: temas[0] ? clamp10(temas[0].percentual / 10 + 3) : 3,
      comentario: "Estimado pelas palavras que mais se repetem nas legendas.",
    },
    posicionamento: {
      proposta: profile.bio.split("\n")[0] || "Sem bio pra ler a proposta.",
      publico: "Precisa da análise com IA.",
      tom: "Precisa da análise com IA.",
      diferenciais: [],
      pontosFracos: [],
    },
    temas,
    narrativas: [],
    hooks: {
      padroes,
      nota: clamp10(qualPosts.reduce((a, q) => a + q.forcaHook, 0) / qualPosts.length),
      sugestoes: [`O tipo de hook que mais rende aqui é "${best}". Vale testar mais dele.`],
    },
    qualidade: {
      nota: clamp10(5 + (quant.postsPerWeek >= 3 ? 1.5 : 0) + (quant.ctaShare >= 40 ? 1.5 : 0)),
      consistencia: `${quant.postsPerWeek} posts por semana.`,
      legendas: `Legendas com ${quant.avgCaptionLength} caracteres e ${quant.avgHashtags} hashtags em média.`,
      ctas: `${quant.ctaShare}% dos posts têm chamada pra ação.`,
      comentario: "Nota estimada por frequência e uso de chamadas pra ação.",
    },
    posts: qualPosts,
    furarBolha: {
      diagnostico:
        reach != null
          ? reach >= 1
            ? `Os Reels têm em média ${reach.toFixed(1)}x mais views que seguidores. O perfil já chega em gente de fora.`
            : `Os Reels alcançam em média ${Math.round(reach * 100)}% dos seguidores em views. O conteúdo ainda roda mais dentro da base.`
          : "Sem views de Reels públicas, a leitura de alcance fica limitada.",
      oQueFunciona: reel ? [`Reels têm ${reel.avgEngagement}% de engajamento médio.`, `Hooks do tipo "${best}".`] : [`Hooks do tipo "${best}".`],
      oQueEvitar: qualPosts.some((q) => q.riscoRecomendacao) ? ["Pedidos de comentário com palavra-chave e reposts."] : [],
      ideias: [],
    },
    recomendacoes: [
      {
        titulo: "Conectar a análise com IA",
        detalhe: "Com a chave da Anthropic a plataforma lê posicionamento, narrativas e sugere ideias de conteúdo.",
        prioridade: "alta",
      },
    ],
  };
}

export async function analyzeQualitative(
  profile: Profile,
  posts: Post[],
  quant: Quantitative,
): Promise<{ qual: Qualitative; warning?: string }> {
  if (!claudeConfigured()) return { qual: basicAnalysis(profile, posts, quant) };
  try {
    const qual = await claudeAnalysis(profile, posts, quant);
    // garante um item por post, mesmo se a IA pular algum
    const basic = basicAnalysis(profile, posts, quant);
    const have = new Set(qual.posts.map((p) => p.id));
    qual.posts.push(...basic.posts.filter((p) => !have.has(p.id)));
    return { qual };
  } catch (err) {
    console.error("analise com IA", err);
    const msg =
      err instanceof Anthropic.AuthenticationError
        ? "A chave da Anthropic é inválida."
        : err instanceof Anthropic.RateLimitError
          ? "Limite da Anthropic atingido."
          : err instanceof Anthropic.APIError
            ? `Erro da Anthropic (${err.status}): ${String(err.message).slice(0, 300)}`
            : err instanceof Error
              ? err.message
              : "Erro desconhecido na IA.";
    return {
      qual: basicAnalysis(profile, posts, quant),
      warning: `${msg} Mostrando a análise básica no lugar.`,
    };
  }
}
