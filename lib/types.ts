export type MediaFormat = "REEL" | "CAROUSEL" | "IMAGE" | "VIDEO";

export interface Post {
  id: string;
  caption: string;
  format: MediaFormat;
  timestamp: string; // ISO
  likes: number | null; // null quando o perfil esconde curtidas
  comments: number | null;
  views: number | null; // só Reels; null quando escondido
  permalink: string;
  thumbnail: string | null;
  insights?: PostInsights; // só com opt-in
}

/** Dados internos de um post. Só existem quando o dono do perfil autoriza (opt-in). */
export interface PostInsights {
  reach: number | null;
  views: number | null;
  saved: number | null;
  shares: number | null; // envios
  interactions: number | null;
  avgWatchTimeSec: number | null; // só Reels
}

export interface Breakdown {
  label: string;
  value: number;
}

/** Visão do perfil com dados internos (opt-in). */
export interface PrivateData {
  periodDays: number;
  reachTotal: number | null;
  reachFollowers: number | null;
  reachNonFollowers: number | null;
  nonFollowerShare: number | null; // % do alcance que veio de não seguidores
  avgReach: number | null;
  reachPerFollower: number | null;
  likesPerReach: number | null; // %
  sendsPerReach: number | null; // %
  savesPerReach: number | null; // %
  avgWatchTimeSec: number | null;
  demographics: { age: Breakdown[]; gender: Breakdown[]; city: Breakdown[] };
}

export interface Profile {
  username: string;
  name: string;
  bio: string;
  website: string | null;
  avatar: string | null;
  followers: number;
  following: number;
  mediaCount: number;
}

export type DataSource = "instagram" | "optin" | "demo";

/* ---------- Quantitativo ---------- */

export interface PostMetrics {
  id: string;
  engagementRate: number; // (curtidas + comentários) / seguidores, em %
  viewsPerFollower: number | null; // views / seguidores (só Reels)
  relativeToMedian: number; // ER do post / mediana do perfil
  commentRatio: number | null; // comentários / curtidas
  captionLength: number;
  hashtags: number;
  hasCta: boolean;
  hook: string; // primeira linha da legenda
}

export interface FormatStat {
  format: MediaFormat;
  count: number;
  share: number; // % dos posts
  avgEngagement: number;
  avgViews: number | null;
  avgViewsPerFollower: number | null;
}

export interface Quantitative {
  postsAnalyzed: number;
  periodDays: number;
  postsPerWeek: number;
  avgEngagement: number;
  medianEngagement: number;
  avgLikes: number | null;
  avgComments: number | null;
  avgReelViews: number | null;
  reelsReachRatio: number | null; // média de views/seguidores nos Reels
  hiddenLikesShare: number; // % de posts sem curtidas públicas
  byFormat: FormatStat[];
  byWeekday: { day: string; posts: number; avgEngagement: number }[];
  byHour: { hour: number; posts: number; avgEngagement: number }[];
  timeline: { id: string; date: string; engagement: number; format: MediaFormat }[];
  avgCaptionLength: number;
  avgHashtags: number;
  ctaShare: number;
  posts: Record<string, PostMetrics>;
  outliers: string[]; // ids acima de 2x a mediana
}

/* ---------- Qualitativo ---------- */

export interface QualPost {
  id: string;
  tema: string;
  hook: string;
  tipoHook: string;
  forcaHook: number; // 0-10
  potencialEnvio: number; // 0-10, chance de alguém mandar por DM
  riscoRecomendacao: string | null;
  leitura: string; // por que performou (ou não)
}

export interface Destaque {
  numero: string; // ex.: "7x", "72%", "2"
  titulo: string; // até 8 palavras
  detalhe: string; // até 18 palavras
  tipo: "forte" | "alerta" | "oportunidade";
}

export interface Qualitative {
  engine: "claude" | "basico";
  destaques?: Destaque[];
  categoriaRadar?: string; // id da categoria do Radar mais parecida com o perfil
  resumo: string;
  nicho: { principal: string; subnichos: string[]; clareza: number; comentario: string };
  posicionamento: {
    proposta: string;
    publico: string;
    tom: string;
    diferenciais: string[];
    pontosFracos: string[];
  };
  temas: { nome: string; percentual: number; desempenho: "acima" | "na média" | "abaixo"; comentario: string }[];
  narrativas: { nome: string; descricao: string }[];
  hooks: { padroes: { tipo: string; exemplo: string; efetividade: string }[]; nota: number; sugestoes: string[] };
  qualidade: { nota: number; consistencia: string; legendas: string; ctas: string; comentario: string };
  posts: QualPost[];
  furarBolha: {
    diagnostico: string;
    oQueFunciona: string[];
    oQueEvitar: string[];
    ideias: { titulo: string; formato: string; hook: string; porque: string }[];
  };
  recomendacoes: { titulo: string; detalhe: string; prioridade: "alta" | "média" | "baixa" }[];
}

/* ---------- Furar a bolha ---------- */

export interface BubbleSignal {
  key: string;
  label: string;
  value: number; // 0-1
  weight: number;
  note: string;
}

export interface BubbleScore {
  id: string;
  score: number; // 0-100
  signals: BubbleSignal[];
}

export interface Bubble {
  profileScore: number;
  posts: BubbleScore[];
  topIds: string[];
}

/* ---------- Resultado final ---------- */

export interface Analysis {
  handle: string;
  source: DataSource;
  createdAt: string;
  profile: Profile;
  posts: Post[];
  quant: Quantitative;
  qual: Qualitative;
  bubble: Bubble;
  privado: PrivateData | null;
  warnings: string[];
}
