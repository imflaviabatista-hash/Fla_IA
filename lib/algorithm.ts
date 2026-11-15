import type { Bubble, BubbleScore, BubbleSignal, Post, Quantitative, Qualitative } from "./types";

/**
 * Base de conhecimento do algoritmo, só com o que a própria Meta (ou o chefe do
 * Instagram, Adam Mosseri) falou publicamente. Cada regra tem fonte.
 * Quando a Meta atualizar algo, é aqui que muda.
 */

export interface AlgorithmRule {
  id: string;
  titulo: string;
  oQueDiz: string;
  comoUsamos: string;
  superficie: string;
  fonte: { nome: string; url: string; data: string; tipo: "Documento oficial" | "Fala do Mosseri" | "Documentação da API" };
}

export const ALGORITHM_RULES: AlgorithmRule[] = [
  {
    id: "superficies",
    titulo: "Cada parte do app tem um algoritmo próprio",
    oQueDiz:
      "Feed, Stories, Reels e Explorar usam sistemas diferentes. No Feed e nos Stories o foco é quem você já segue. Reels e Explorar são onde a maior parte do conteúdo vem de contas que a pessoa não segue.",
    comoUsamos: "Reels pesam mais na nota de furar a bolha, porque é a principal vitrine pra quem não te segue.",
    superficie: "Todas",
    fonte: {
      nome: "Instagram Ranking Explained (Adam Mosseri)",
      url: "https://about.instagram.com/blog/announcements/instagram-ranking-explained",
      data: "mai/2023",
      tipo: "Documento oficial",
    },
  },
  {
    id: "tres-sinais",
    titulo: "Os 3 sinais que mais pesam: tempo assistido, curtidas e envios",
    oQueDiz:
      "Segundo o Mosseri, os sinais mais importantes pro ranqueamento são tempo assistido, curtidas por alcance e envios por alcance (quando alguém manda o post por DM).",
    comoUsamos:
      "Como de fora não dá pra ver tempo assistido nem envios, a gente usa sinais aproximados: força do hook (segura a pessoa no começo) e potencial de envio (é algo que alguém mandaria pra um amigo?).",
    superficie: "Reels e Explorar",
    fonte: {
      nome: "Mosseri via Social Media Today",
      url: "https://www.socialmediatoday.com/news/instagram-shares-algorithm-insights-2025/738034/",
      data: "jan/2025",
      tipo: "Fala do Mosseri",
    },
  },
  {
    id: "envios",
    titulo: "Envio por DM é o sinal mais forte pra alcançar quem não te segue",
    oQueDiz:
      "Mosseri disse que envios por alcance pesam um pouco mais pra chegar em não seguidores, enquanto curtidas pesam mais com quem já te segue.",
    comoUsamos: "O potencial de envio tem o maior peso entre os sinais qualitativos da nota.",
    superficie: "Reels e Explorar",
    fonte: {
      nome: "Mosseri via Social Media Today",
      url: "https://www.socialmediatoday.com/news/instagram-shares-algorithm-insights-2025/738034/",
      data: "jan/2025",
      tipo: "Fala do Mosseri",
    },
  },
  {
    id: "previsoes",
    titulo: "O algoritmo prevê o que você vai fazer com cada post",
    oQueDiz:
      "O sistema calcula a chance de a pessoa interagir de vários jeitos (curtir, comentar, salvar, compartilhar, passar o carrossel, ver o perfil) e monta uma nota de relevância pra ordenar o conteúdo.",
    comoUsamos: "Por isso olhamos várias interações juntas e não só curtidas.",
    superficie: "Feed",
    fonte: {
      nome: "Meta Transparency Center: Instagram Feed AI system",
      url: "https://transparency.meta.com/features/explaining-ranking/ig-feed",
      data: "atualizado em 2026",
      tipo: "Documento oficial",
    },
  },
  {
    id: "sistema-cards",
    titulo: "Os sinais mudam com frequência",
    oQueDiz:
      "A Meta publica explicações de cada sistema (Feed, Reels, Explorar, Stories) e avisa que os modelos e sinais mudam o tempo todo.",
    comoUsamos: "A base fica num arquivo só (lib/algorithm.ts) pra ser revisada sempre que a Meta atualizar.",
    superficie: "Todas",
    fonte: {
      nome: "Meta Transparency Center: Explaining ranking",
      url: "https://transparency.meta.com/features/explaining-ranking",
      data: "contínuo",
      tipo: "Documento oficial",
    },
  },
  {
    id: "recomendacao",
    titulo: "Nem todo conteúdo pode ser recomendado pra quem não te segue",
    oQueDiz:
      "As Diretrizes de Recomendação dizem que alguns conteúdos podem continuar no perfil mas não são sugeridos pra não seguidores, por exemplo conteúdo de baixa qualidade, isca de engajamento ou conteúdo sensível.",
    comoUsamos: "A análise com IA aponta posts com risco de não serem recomendados e isso tira pontos da nota.",
    superficie: "Reels, Explorar e Sugestões",
    fonte: {
      nome: "Diretrizes de Recomendação do Instagram",
      url: "https://help.instagram.com/313829416281232",
      data: "contínuo",
      tipo: "Documento oficial",
    },
  },
  {
    id: "originalidade",
    titulo: "Conteúdo original é priorizado",
    oQueDiz:
      "O Instagram anunciou que passa a priorizar o criador original nas recomendações e reduz a distribuição de contas que só repostam conteúdo dos outros.",
    comoUsamos: "Repost, marca d'água de outro app e conteúdo agregado entram como risco de recomendação.",
    superficie: "Reels e Explorar",
    fonte: {
      nome: "Blog oficial do Instagram (anúncios)",
      url: "https://about.instagram.com/blog/announcements",
      data: "abr/2024",
      tipo: "Documento oficial",
    },
  },
  {
    id: "dados-publicos",
    titulo: "O que dá pra medir de fora",
    oQueDiz:
      "A API oficial (Business Discovery) entrega seguidores, posts, curtidas, comentários e views de Reels de contas comerciais e de criador. Não entrega alcance, salvamentos, envios nem tempo assistido de outros perfis.",
    comoUsamos:
      "Views dos Reels divididas pelos seguidores é nosso sinal mais forte de que o conteúdo chegou em gente de fora. Se passou de 1, com certeza chegou em quem não segue.",
    superficie: "Dados",
    fonte: {
      nome: "Documentação da Meta: Business Discovery",
      url: "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery",
      data: "2026",
      tipo: "Documentação da API",
    },
  },
];

const FORMAT_FIT: Record<string, number> = { REEL: 1, VIDEO: 0.6, CAROUSEL: 0.55, IMAGE: 0.3 };
const br = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const medianOf = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function computeBubble(posts: Post[], quant: Quantitative, qual: Qualitative, followers = 1): Bubble {
  const qualById = new Map(qual.posts.map((p) => [p.id, p]));
  // Com opt-in, os sinais estimados viram dados reais da Meta
  const sendRate = (p: Post) => (p.insights?.reach && p.insights.shares != null ? p.insights.shares / p.insights.reach : null);
  const medSend = medianOf(posts.map(sendRate).filter((x): x is number => x != null));
  const medWatch = medianOf(posts.map((p) => p.insights?.avgWatchTimeSec).filter((x): x is number => x != null));

  const scores: BubbleScore[] = posts.map((post) => {
    const m = quant.posts[post.id];
    const q = qualById.get(post.id);
    const signals: BubbleSignal[] = [];

    const reach = post.insights?.reach;
    if (reach != null) {
      const ratio = reach / Math.max(followers, 1);
      signals.push({
        key: "alcance",
        label: "Alcance vs. seguidores (real)",
        value: clamp01(ratio / 3),
        weight: 35,
        note: ratio >= 1 ? `Alcançou ${br(ratio, 1)}x os seguidores.` : `Alcançou ${Math.round(ratio * 100)}% dos seguidores.`,
      });
    } else if (m.viewsPerFollower != null) {
      signals.push({
        key: "alcance",
        label: "Views vs. seguidores",
        value: clamp01(m.viewsPerFollower / 3),
        weight: 35,
        note:
          m.viewsPerFollower >= 1
            ? `${br(m.viewsPerFollower, 1)}x os seguidores. Chegou em gente de fora.`
            : `${Math.round(m.viewsPerFollower * 100)}% dos seguidores. Ficou mais na base.`,
      });
    }
    signals.push({
      key: "relativo",
      label: "Desempenho vs. média do perfil",
      value: clamp01(m.relativeToMedian / 3),
      weight: 20,
      note: `${br(m.relativeToMedian, 1)}x a mediana de engajamento do perfil.`,
    });
    const sr = sendRate(post);
    if (sr != null && medSend) {
      signals.push({
        key: "envio",
        label: "Envios por alcance (real)",
        value: clamp01(sr / (medSend * 2)),
        weight: 20,
        note: `${br(sr * 100, 2)}% de quem viu mandou pra alguém. A mediana do perfil é ${br(medSend * 100, 2)}%.`,
      });
    } else {
      signals.push({
        key: "envio",
        label: "Potencial de envio por DM",
        value: clamp01((q?.potencialEnvio ?? 5) / 10),
        weight: 20,
        note: "Estimativa de envios por alcance.",
      });
    }
    const wt = post.insights?.avgWatchTimeSec;
    if (wt != null && medWatch) {
      signals.push({
        key: "hook",
        label: "Tempo médio assistido (real)",
        value: clamp01(wt / (medWatch * 2)),
        weight: 15,
        note: `${wt.toLocaleString("pt-BR")}s em média. A mediana do perfil é ${medWatch.toLocaleString("pt-BR")}s.`,
      });
    } else {
      signals.push({
        key: "hook",
        label: "Força do hook",
        value: clamp01((q?.forcaHook ?? 5) / 10),
        weight: 15,
        note: "Estimativa de tempo assistido.",
      });
    }
    signals.push({
      key: "formato",
      label: "Formato",
      value: FORMAT_FIT[post.format] ?? 0.3,
      weight: 10,
      note: post.format === "REEL" ? "Reels são a principal vitrine pra não seguidores." : "Formato com menos distribuição fora da base.",
    });

    const totalWeight = signals.reduce((a, s) => a + s.weight, 0);
    let score = (signals.reduce((a, s) => a + s.value * s.weight, 0) / totalWeight) * 100;
    if (q?.riscoRecomendacao) score -= 10;

    return { id: post.id, score: Math.round(Math.max(0, Math.min(100, score))), signals };
  });

  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const profileScore = Math.round(scores.reduce((a, s) => a + s.score, 0) / Math.max(scores.length, 1));

  return { profileScore, posts: scores, topIds: sorted.slice(0, 6).map((s) => s.id) };
}
