/** Classifica a primeira frase da legenda num tipo de hook. Usado na análise básica e no Radar. */
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

