import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { extractJson } from "./ai";
import { kvGet, kvSet } from "./kv";
import { firstLine } from "./metrics";
import type { Analysis } from "./types";

/**
 * Seções de monetização do Raio-X: marcas com sinergia, permuta e afiliados,
 * e como atrair e fechar publis.
 *
 * Tudo que vem de fora do perfil (marcas, programas, links, preços, regras do CONAR)
 * é pesquisado na web na hora, com a fonte e a data da consulta.
 * Os números do perfil vêm sempre da análise, nunca da IA.
 */

export type Secao = "marcas" | "afiliados" | "publis";
export const SECOES: Secao[] = ["marcas", "afiliados", "publis"];

/* ------------------------------------------------------------------ */
/* Contexto do perfil, calculado a partir da análise                    */
/* ------------------------------------------------------------------ */

const PUBLI_RE = /#publi\b|#publicidade|#ad\b|#parceriapaga|parceria paga|\bpubli\b|#parceria\b|patrocinad|#recebido|#presente/i;

export interface MarcaMencionada {
  handle: string;
  vezes: number;
  emPubli: number;
}

export interface PostPubli {
  id: string;
  hook: string;
  permalink: string;
  format: string;
  data: string;
  engajamento: number; // %
  vsTipico: number; // x a mediana do perfil
  views: number | null;
  marcas: string[];
}

export interface MonetCtx {
  handle: string;
  seguidores: number;
  cidade: { nome: string | null; fonte: "público (dados internos)" | "bio ou legendas" | "não encontrada" };
  mencionadas: MarcaMencionada[];
  publis: PostPubli[];
  melhorPubli: PostPubli | null;
}

export function buildContext(a: Analysis): MonetCtx {
  const own = a.profile.username.toLowerCase();
  const base = a.quant.medianEngagement || 0.0001;
  const map = new Map<string, MarcaMencionada>();
  const publis: PostPubli[] = [];

  for (const p of a.posts) {
    const handles = [...new Set((p.caption.match(/@([a-z0-9._]{2,30})/gi) ?? []).map((h) => h.slice(1).toLowerCase().replace(/\.$/, "")))].filter(
      (h) => h !== own,
    );
    const isPubli = PUBLI_RE.test(p.caption);
    for (const h of handles) {
      const m = map.get(h) ?? { handle: h, vezes: 0, emPubli: 0 };
      m.vezes++;
      if (isPubli) m.emPubli++;
      map.set(h, m);
    }
    if (isPubli) {
      const er = a.quant.posts[p.id]?.engagementRate ?? 0;
      publis.push({
        id: p.id,
        hook: firstLine(p.caption),
        permalink: p.permalink,
        format: p.format,
        data: p.timestamp.slice(0, 10),
        engajamento: Math.round(er * 100) / 100,
        vsTipico: Math.round((er / base) * 10) / 10,
        views: p.views,
        marcas: handles,
      });
    }
  }

  const topCity = a.privado?.demographics.city?.[0]?.label ?? null;
  return {
    handle: a.profile.username,
    seguidores: a.profile.followers,
    cidade: topCity ? { nome: topCity, fonte: "público (dados internos)" } : { nome: null, fonte: "não encontrada" },
    mencionadas: [...map.values()].sort((x, y) => y.emPubli - x.emPubli || y.vezes - x.vezes).slice(0, 20),
    publis: publis.sort((x, y) => y.vsTipico - x.vsTipico),
    melhorPubli: publis.length ? [...publis].sort((x, y) => y.vsTipico - x.vsTipico)[0] : null,
  };
}

function profileBrief(a: Analysis, ctx: MonetCtx) {
  const q = a.qual;
  const fmt = [...a.quant.byFormat].sort((x, y) => y.avgEngagement - x.avgEngagement)[0];
  const d = a.privado?.demographics;
  return `PERFIL
@${a.profile.username} (${a.profile.name}) · ${a.profile.followers} seguidores · ${a.quant.postsPerWeek} posts por semana
Bio: ${a.profile.bio || "(sem bio)"}
Link na bio: ${a.profile.website ?? "(nenhum)"}
Nicho: ${q.nicho.principal} · subnichos: ${q.nicho.subnichos.join(", ")}
Público (leitura da análise): ${q.posicionamento.publico}
Tom: ${q.posicionamento.tom}
Temas: ${q.temas.map((t) => `${t.nome} (${t.percentual}%, ${t.desempenho} da média)`).join("; ")}

NÚMEROS REAIS (use exatamente estes, sem arredondar pra cima)
Engajamento típico (mediana): ${a.quant.medianEngagement}% · média: ${a.quant.avgEngagement}%
Views médias dos Reels: ${a.quant.avgReelViews ?? "não disponível"} · views ÷ seguidores: ${a.quant.reelsReachRatio ?? "não disponível"}
Formato que mais engaja: ${fmt ? `${fmt.format} (${fmt.avgEngagement}%)` : "não disponível"}
${
  a.privado
    ? `Dados internos (autorizados): ${a.privado.nonFollowerShare ?? "?"}% do alcance de não seguidores; envios por alcance ${a.privado.sendsPerReach ?? "?"}%; salvamentos por alcance ${a.privado.savesPerReach ?? "?"}%.
Público: idade ${d?.age.map((x) => `${x.label}: ${x.value}`).join(", ")}; gênero ${d?.gender.map((x) => `${x.label}: ${x.value}`).join(", ")}; cidades ${d?.city.map((x) => `${x.label}: ${x.value}`).join(", ")}`
    : "Sem dados internos (o perfil não autorizou o opt-in). Idade, gênero e cidade do público não são conhecidos."
}

CIDADE: ${ctx.cidade.nome ? `${ctx.cidade.nome} (fonte: ${ctx.cidade.fonte})` : "não informada pelos dados. Tente descobrir pela bio e pelas legendas. Se não der pra ter certeza, diga que não encontrou."}

MARCAS E PERFIS QUE ELA JÁ MARCOU (contagem nos últimos ${a.posts.length} posts)
${ctx.mencionadas.length ? ctx.mencionadas.map((m) => `@${m.handle}: ${m.vezes}x${m.emPubli ? `, ${m.emPubli} em publi` : ""}`).join("\n") : "(nenhuma marcação encontrada)"}

POSTS DE PUBLI DETECTADOS (do melhor pro pior, comparado ao engajamento típico dela)
${
  ctx.publis.length
    ? ctx.publis
        .slice(0, 8)
        .map((p) => `- ${p.data} · ${p.format} · ${p.vsTipico}x o típico · ${p.engajamento}% de engajamento${p.views != null ? ` · ${p.views} views` : ""} · marcas: ${p.marcas.map((m) => "@" + m).join(", ") || "(sem @)"} · "${p.hook}" · ${p.permalink}`)
        .join("\n")
    : "(nenhum post de publi detectado)"
}

LEITURA DA ANÁLISE
${q.resumo}
Destaques: ${(q.destaques ?? []).map((x) => `${x.numero} ${x.titulo}`).join("; ")}`;
}

const VOICE = `Escreva em português do Brasil, falando direto com ela (você), como uma amiga que entende de marketing de influência. Frases curtas. Nada de travessão, linguagem corporativa ou clichês como "potencialize", "alavanque", "mergulhe". Seja honesta e prática.

Esse material é usado numa mentoria pra micro e nano influenciadoras que querem se posicionar e começar a ganhar dinheiro com o perfil. Toda sugestão precisa sair dos dados do perfil abaixo. Nada genérico que serviria pra qualquer pessoa.

REGRAS DE VERDADE (obrigatórias)
- Nunca invente marca, programa, link, e-mail, preço ou número.
- Use a pesquisa na web pra confirmar o que vem de fora do perfil. Só inclua o que você confirmou numa fonte encontrada agora, e informe a URL da fonte.
- Se não achar um contato, um link oficial ou um dado, não chute: deixe o campo vazio e coloque o item em "naoEncontrado".
- Números do perfil: use só os números recebidos.
- Responda no final apenas com um objeto JSON válido, sem texto antes ou depois.`;

/* ------------------------------------------------------------------ */
/* Schemas tolerantes                                                   */
/* ------------------------------------------------------------------ */

const str = z.preprocess((v) => (v == null ? "" : String(v)), z.string()).catch("");
const strN = z.preprocess((v) => (v == null || v === "" ? null : String(v)), z.string().nullable()).catch(null);
const strs = z.array(str).catch([]);
const fonte = z.object({ titulo: str, url: str, data: str });

const MarcaSchema = z.object({
  nome: str,
  instagram: strN,
  site: strN,
  porque: str,
  conteudo: str,
  contato: z.object({ tipo: str, valor: str, fonte: strN }).catch({ tipo: "", valor: "", fonte: null }),
  jaTrabalhou: z.boolean().catch(false),
});
export const MarcasSchema = z.object({
  cidade: z.object({ nome: strN, fonte: str }).catch({ nome: null, fonte: "" }),
  jaPerformou: z.array(z.object({ marca: str, resumo: str, permalink: strN })).catch([]),
  locais: z.array(MarcaSchema).catch([]),
  nacionais: z.array(MarcaSchema).catch([]),
  sonho: z.array(MarcaSchema).catch([]),
  dica: str,
  naoEncontrado: strs,
});

export const AfiliadosSchema = z.object({
  programas: z
    .array(
      z.object({
        nome: str,
        tipo: str,
        oQueE: str,
        aceitaPequenos: str,
        beneficio: str,
        passos: strs,
        link: str,
        fonte: str,
        porqueCombina: str,
      }),
    )
    .catch([]),
  permuta: z
    .object({ alvos: strs, passos: strs, mensagem: str, oQueOferecer: strs })
    .catch({ alvos: [], passos: [], mensagem: "", oQueOferecer: [] }),
  naoEncontrado: strs,
});

export const PublisSchema = z.object({
  perfil: z
    .object({ bio: str, destaques: strs, linkNaBio: strs, midiaKit: strs })
    .catch({ bio: "", destaques: [], linkNaBio: [], midiaKit: [] }),
  abordagem: z
    .object({ dm: str, emailAssunto: str, emailCorpo: str, caseResumo: str })
    .catch({ dm: "", emailAssunto: "", emailCorpo: "", caseResumo: "" }),
  preco: z
    .object({ faixa: str, porFormato: z.array(z.object({ formato: str, faixa: str })).catch([]), fontes: z.array(fonte).catch([]), argumento: str, aviso: str })
    .catch({ faixa: "", porFormato: [], fontes: [], argumento: "", aviso: "" }),
  entrega: z
    .object({ briefing: strs, prazos: strs, aprovacao: strs, relatorio: strs })
    .catch({ briefing: [], prazos: [], aprovacao: [], relatorio: [] }),
  regras: z
    .object({ guia: z.object({ nome: str, versao: str, url: str }).catch({ nome: "", versao: "", url: "" }), pontos: strs })
    .catch({ guia: { nome: "", versao: "", url: "" }, pontos: [] }),
  passoMonetizacao: z.object({ titulo: str, detalhe: str }).catch({ titulo: "", detalhe: "" }),
  naoEncontrado: strs,
});

export type MarcasData = z.infer<typeof MarcasSchema>;
export type AfiliadosData = z.infer<typeof AfiliadosSchema>;
export type PublisData = z.infer<typeof PublisSchema>;

export interface MonetResult<T> {
  secao: Secao;
  handle: string;
  consultadoEm: string; // ISO
  ctx: MonetCtx;
  data: T;
  fontes: { titulo: string; url: string }[]; // URLs que a pesquisa citou
}

/* ------------------------------------------------------------------ */
/* Prompts                                                              */
/* ------------------------------------------------------------------ */

const hoje = () => new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

const PROMPTS: Record<Secao, (brief: string) => string> = {
  marcas: (brief) => `${brief}

TAREFA: Seção "Marcas com sinergia". Hoje é ${hoje()}.
1. Comece pelas marcas que ela já marcou ou divulgou. Em "jaPerformou", resuma o que performou bem em publi usando os números recebidos (ex.: "2,3x o seu engajamento típico"), com o link do post.
2. Monte de 8 a 12 marcas no total, em 3 grupos:
   - locais: lojas, salões, restaurantes, eventos da cidade dela. Só inclua se souber a cidade e encontrar a marca na pesquisa. Se não souber a cidade, deixe vazio e diga em naoEncontrado.
   - nacionais: marcas acessíveis que comprovadamente já trabalham com micro e nano influenciadoras (confirme na pesquisa: programa de creators, campanhas com perfis pequenos, plataforma que usam).
   - sonho: marcas pra mirar no médio prazo, coerentes com o nicho e o tom dela.
3. Pra cada marca: "porque" (ligado aos dados dela), "conteudo" (formato e ideia concreta, usando o que funciona no perfil dela), "contato" com tipo ("instagram", "email", "agencia", "plataforma" ou "site"), o valor e a URL onde você confirmou. E-mail só se estiver publicado numa página oficial encontrada agora. Se não achar contato direto, use o @ oficial confirmado ou a plataforma de creators que a marca usa.
4. "instagram" é o @ oficial confirmado (sem @). "jaTrabalhou" = true se ela já marcou a marca.
5. "dica": uma frase sobre por onde começar.

Formato do JSON:
{"cidade":{"nome":string|null,"fonte":string},"jaPerformou":[{"marca":string,"resumo":string,"permalink":string|null}],"locais":[MARCA],"nacionais":[MARCA],"sonho":[MARCA],"dica":string,"naoEncontrado":[string]}
MARCA = {"nome":string,"instagram":string|null,"site":string|null,"porque":string,"conteudo":string,"contato":{"tipo":string,"valor":string,"fonte":string|null},"jaTrabalhou":boolean}`,

  afiliados: (brief) => `${brief}

TAREFA: Seção "Permuta e programas de afiliados". Hoje é ${hoje()}.
1. Pesquise programas de afiliados e plataformas de creators que fazem sentido pro nicho dela, no Brasil: programas de afiliados de varejistas e marketplaces, programas de embaixadoras de marcas do nicho, plataformas que conectam marcas e creators.
2. Confirme cada programa numa página oficial agora: se está ativo, se aceita perfis pequenos (e o requisito mínimo, se houver), como funciona a comissão ou o benefício, e o passo a passo de cadastro. Programa encerrado, link quebrado ou regra que você não conseguiu confirmar não entra (vai pra naoEncontrado).
3. "link" é o link oficial de cadastro ou da página do programa. "fonte" é a URL onde você confirmou as regras. "tipo": "afiliados", "embaixadora" ou "plataforma". "porqueCombina" liga o programa aos dados dela.
4. Liste de 4 a 8 programas.
5. Permuta com loja local: "alvos" (tipos de negócio da cidade dela que combinam com os temas dela), "passos" (mini roteiro de 4 a 6 passos), "mensagem" (DM pronta, curta, no tom dela, citando um número real dela) e "oQueOferecer" (entregas concretas).

Formato do JSON:
{"programas":[{"nome":string,"tipo":string,"oQueE":string,"aceitaPequenos":string,"beneficio":string,"passos":[string],"link":string,"fonte":string,"porqueCombina":string}],"permuta":{"alvos":[string],"passos":[string],"mensagem":string,"oQueOferecer":[string]},"naoEncontrado":[string]}`,

  publis: (brief) => `${brief}

TAREFA: Seção "Como atrair e fechar publis". Hoje é ${hoje()}.
1. perfil: "bio" (sugestão de bio pronta, até 150 caracteres, a partir da bio atual), "destaques" (destaques fixos que ela deveria ter, com o que colocar em cada um), "linkNaBio" (o que colocar), "midiaKit" (o que entra no mídia kit e em que ordem; os números serão preenchidos pela plataforma com os dados reais, então não escreva números de seguidores ou engajamento aqui).
2. abordagem: "dm" (mensagem curta pra DM), "emailAssunto" e "emailCorpo" (e-mail curto), ambos citando o que ela entrega e o case da melhor publi dela. "caseResumo": uma frase com o case usando os números recebidos. Se não houver publi detectada, use o post de melhor desempenho e diga isso.
3. preco: pesquise referências públicas de preço de publi no Brasil pro tamanho de perfil dela (pesquisas de mercado, plataformas de influência, matérias recentes). "faixa" e "porFormato" só com valores encontrados nas fontes, citando as fontes em "fontes" (titulo, url, data da publicação se houver). "argumento": como o engajamento e as views dela, comparados ao que as fontes dizem ser comum, ajudam a cobrar mais (só se os números dela estiverem de fato acima). "aviso": deixe claro que é referência, não regra.
4. entrega: listas curtas de briefing, prazos, aprovação e relatório pós-publi (o que medir e mandar pra virar parceria recorrente).
5. regras: pesquise a versão atual do Guia de Publicidade por Influenciadores Digitais do CONAR, confirme no site oficial e informe nome, versão/ano e URL. "pontos": de 3 a 5 regras práticas de sinalização de publi que estejam no guia.
6. passoMonetizacao: o primeiro passo concreto de monetização pra ela fazer esta semana (título de até 6 palavras e detalhe curto).

Formato do JSON:
{"perfil":{"bio":string,"destaques":[string],"linkNaBio":[string],"midiaKit":[string]},"abordagem":{"dm":string,"emailAssunto":string,"emailCorpo":string,"caseResumo":string},"preco":{"faixa":string,"porFormato":[{"formato":string,"faixa":string}],"fontes":[{"titulo":string,"url":string,"data":string}],"argumento":string,"aviso":string},"entrega":{"briefing":[string],"prazos":[string],"aprovacao":[string],"relatorio":[string]},"regras":{"guia":{"nome":string,"versao":string,"url":string},"pontos":[string]},"passoMonetizacao":{"titulo":string,"detalhe":string},"naoEncontrado":[string]}`,
};

const LIMITS: Record<Secao, { search: number; fetch: number }> = {
  marcas: { search: 8, fetch: 3 },
  afiliados: { search: 8, fetch: 5 },
  publis: { search: 6, fetch: 3 },
};

const SCHEMAS = { marcas: MarcasSchema, afiliados: AfiliadosSchema, publis: PublisSchema } as const;

/* ------------------------------------------------------------------ */
/* Execução                                                             */
/* ------------------------------------------------------------------ */

const KEY = (h: string, s: Secao) => `monet:${h}:${s}`;

export async function readMonet(handle: string, secao: Secao) {
  return kvGet<MonetResult<unknown>>(KEY(handle, secao));
}

function cityLocation(nome: string | null) {
  if (!nome) return undefined;
  const [city, region] = nome.split(",").map((x) => x.trim());
  return { type: "approximate" as const, country: "BR", city, region: region || undefined, timezone: "America/Sao_Paulo" };
}

export async function runMonet(a: Analysis, secao: Secao): Promise<MonetResult<unknown>> {
  const ctx = buildContext(a);
  const client = new Anthropic({ timeout: 280_000, maxRetries: 0 });
  const brief = profileBrief(a, ctx);
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    {
      type: "web_search_20260209",
      name: "web_search",
      max_uses: LIMITS[secao].search,
      user_location: cityLocation(ctx.cidade.nome) ?? { type: "approximate", country: "BR", timezone: "America/Sao_Paulo" },
    },
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: LIMITS[secao].fetch, max_content_tokens: 8000 },
  ];

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: PROMPTS[secao](brief) }];
  const started = Date.now();
  let response: Anthropic.Beta.BetaMessage | null = null;

  // A pesquisa pode pausar (pause_turn); retoma até o tempo acabar.
  for (let i = 0; i < 4; i++) {
    const left = 285_000 - (Date.now() - started); // a Vercel grátis corta em 300 s
    if (i > 0 && left < 70_000) break;
    response = await client.beta.messages.create(
      {
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: VOICE,
      tools,
      messages,
      },
      { timeout: left - 5_000 },
    );
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlockParam[] });
  }
  if (!response) throw new Error("A pesquisa não respondeu.");
  if (response.stop_reason === "refusal") throw new Error("A IA não conseguiu fazer essa pesquisa.");

  // O JSON fica no texto depois da última pesquisa.
  const blocks = response.content;
  const lastTool = blocks.map((b) => b.type).lastIndexOf("web_search_tool_result");
  const lastFetch = blocks.map((b) => b.type).lastIndexOf("web_fetch_tool_result");
  const from = Math.max(lastTool, lastFetch) + 1;
  const text = blocks
    .slice(from)
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (response.stop_reason === "pause_turn" || !text.includes("{"))
    throw new Error("A pesquisa demorou demais e não terminou. Tenta de novo.");

  const parsed = SCHEMAS[secao].safeParse(extractJson(text));
  if (!parsed.success) throw new Error("A pesquisa voltou num formato inesperado. Tenta de novo.");

  // URLs que a pesquisa citou ou abriu, pra mostrar como fontes
  const fontes = new Map<string, string>();
  for (const b of blocks) {
    if (b.type === "text")
      for (const c of b.citations ?? []) {
        const cc = c as { url?: string; title?: string | null };
        if (cc.url) fontes.set(cc.url, cc.title ?? cc.url);
      }
    if (b.type === "web_search_tool_result" && Array.isArray(b.content))
      for (const r of b.content) {
        const rr = r as { url?: string; title?: string };
        if (rr.url && !fontes.has(rr.url)) fontes.set(rr.url, rr.title ?? rr.url);
      }
  }

  const result: MonetResult<unknown> = {
    secao,
    handle: a.handle,
    consultadoEm: new Date().toISOString(),
    ctx,
    data: parsed.data,
    fontes: [...fontes.entries()].slice(0, 40).map(([url, titulo]) => ({ url, titulo })),
  };
  await kvSet(KEY(a.handle, secao), result).catch((e) => console.error("salvar monetização", e));
  return result;
}
