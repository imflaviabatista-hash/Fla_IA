import type { MediaFormat, Post, Profile } from "./types";

/**
 * Perfil fictício pra testar a plataforma sem token da Meta.
 * Qualquer @ que começar com "demo" cai aqui.
 */

export function isDemoHandle(handle: string) {
  return handle.toLowerCase().startsWith("demo");
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const TEMPLATES: { format: MediaFormat; caption: string; boost: number }[] = [
  { format: "REEL", boost: 3.2, caption: "Ninguém te conta isso sobre organizar a geladeira 👀\n\nFiz esse teste por 30 dias e mudou minha semana. Manda pra quem vive jogando comida fora.\n\n#organizacao #rotina" },
  { format: "REEL", boost: 1.1, caption: "Minha rotina de domingo pra semana não virar caos\n\nSalva pra fazer no próximo domingo." },
  { format: "CAROUSEL", boost: 1.6, caption: "5 erros que deixam sua casa bagunçada em 2 dias\n\nO número 3 eu cometia todo santo dia. Salva e confere a sua casa.\n\n#casaorganizada #dicasdecasa #organizacaodomestica" },
  { format: "IMAGE", boost: 0.5, caption: "Bom dia! Café passado e cozinha limpa, o resto a gente resolve ☕" },
  { format: "REEL", boost: 2.4, caption: "Pare de dobrar toalha assim\n\nEsse jeito ocupa metade do espaço. Manda pra sua mãe que ela vai amar.\n\n#organizacao" },
  { format: "CAROUSEL", boost: 1.2, caption: "Lista de compras que eu uso há 2 anos (e economizo uns R$ 300 por mês)\n\nComenta LISTA que eu te mando o modelo." },
  { format: "REEL", boost: 0.8, caption: "Arruma comigo o quarto das crianças\n\n#arrumecomigo #maternidade #rotinademae" },
  { format: "IMAGE", boost: 0.4, caption: "Nova parceria chegando 💛 Logo conto tudo!\n\n#publi" },
  { format: "REEL", boost: 4.1, caption: "Isso aqui custou R$ 12 e resolveu a bagunça da pia\n\nEu duvidei também. Testa e me conta.\n\n#achadinhos #organizacao" },
  { format: "CAROUSEL", boost: 1.0, caption: "Como eu divido as tarefas da casa com meu marido sem briga\n\nNão é perfeito, mas funciona pra gente. Como é aí?" },
  { format: "REEL", boost: 1.4, caption: "3 hábitos de 5 minutos que salvaram minha casa\n\nO segundo parece bobo mas faz diferença." },
  { format: "REEL", boost: 0.6, caption: "Vlog: um dia normal aqui em casa\n\n#vlog #diaadia #rotina" },
  { format: "CAROUSEL", boost: 1.9, caption: "Checklist da faxina rápida de 20 minutos\n\nSalva esse post pra usar quando chegar visita de surpresa.\n\n#faxina #limpeza" },
  { format: "IMAGE", boost: 0.3, caption: "Sextou com a casa em ordem! Qual o plano de vocês?" },
  { format: "REEL", boost: 2.8, caption: "Você tá limpando o box do jeito errado\n\nTesta essa mistura e depois me agradece. Manda pra quem odeia limpar banheiro." },
  { format: "REEL", boost: 0.9, caption: "Organizando a despensa do zero\n\nFicou assim depois de 3 horas. Valeu cada minuto." },
];

export function demoData(handle: string): { profile: Profile; posts: Post[] } {
  const rand = seeded(42);
  const full = handle.toLowerCase().includes("completo");
  const followers = 48_300;
  const now = new Date("2026-11-14T19:00:00-03:00").getTime();
  const posts: Post[] = [];

  for (let i = 0; i < 40; i++) {
    const t = TEMPLATES[i % TEMPLATES.length];
    const daysAgo = i * 2.2 + rand() * 1.5;
    const hour = [7, 12, 18, 19, 20, 21][Math.floor(rand() * 6)];
    const date = new Date(now - daysAgo * 86_400_000);
    date.setHours(hour, Math.floor(rand() * 60));

    const noise = 0.7 + rand() * 0.6;
    const baseEr = 0.022 * t.boost * noise;
    const engagement = Math.round(followers * baseEr);
    const comments = Math.round(engagement * (0.03 + rand() * 0.05));
    const likes = engagement - comments;
    const hideLikes = i === 21 || i === 33;
    const views = t.format === "REEL" ? Math.round(followers * 0.42 * t.boost * t.boost * noise) : null;
    const reach = Math.round((views ?? followers * 0.35 * t.boost * noise) * 0.72);

    posts.push({
      id: `demo_${i}`,
      caption: t.caption,
      format: t.format,
      timestamp: date.toISOString(),
      likes: hideLikes ? null : likes,
      comments,
      views,
      permalink: "https://www.instagram.com/",
      thumbnail: null,
      ...(full
        ? {
            insights: {
              reach,
              views,
              saved: Math.round(reach * (0.004 + 0.006 * t.boost * rand())),
              shares: Math.round(reach * (0.002 + 0.0045 * t.boost * t.boost * rand())),
              interactions: engagement,
              avgWatchTimeSec: t.format === "REEL" ? Math.round((4 + 2.4 * t.boost + rand() * 2) * 10) / 10 : null,
            },
          }
        : {}),
    });
  }

  return {
    profile: {
      username: handle.toLowerCase(),
      name: "Rotina Leve (perfil de demonstração)",
      bio: "Casa organizada sem neura 🏡\nDicas reais de rotina pra quem trabalha fora\n👇 Meu guia gratuito",
      website: null,
      avatar: null,
      followers,
      following: 612,
      mediaCount: 418,
    },
    posts,
  };
}

/** Dados de conta fictícios pro @demo.completo */
export function demoAccount() {
  return {
    reach: { total: 612_400, rows: [{ label: "FOLLOWER", value: 171_500 }, { label: "NON_FOLLOWER", value: 440_900 }] },
    age: [
      { label: "18-24", value: 7_100 },
      { label: "25-34", value: 21_800 },
      { label: "35-44", value: 13_200 },
      { label: "45-54", value: 4_300 },
      { label: "55-64", value: 1_400 },
    ],
    gender: [
      { label: "F", value: 41_200 },
      { label: "M", value: 6_300 },
      { label: "U", value: 800 },
    ],
    city: [
      { label: "São Paulo, SP", value: 6_900 },
      { label: "Rio de Janeiro, RJ", value: 3_800 },
      { label: "Belo Horizonte, MG", value: 2_100 },
      { label: "Curitiba, PR", value: 1_500 },
      { label: "Salvador, BA", value: 1_200 },
      { label: "Porto Alegre, RS", value: 1_100 },
    ],
  };
}
