import type { MediaFormat } from "./types";

export const FORMAT_LABEL: Record<MediaFormat, string> = {
  REEL: "Reels",
  CAROUSEL: "Carrossel",
  IMAGE: "Foto",
  VIDEO: "Vídeo",
};

export function compact(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function pct(n: number | null | undefined, d = 2) {
  if (n == null) return "—";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: 0 })}%`;
}

export function times(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x`;
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
}

export function scoreLabel(score: number) {
  if (score >= 70) return "Alto";
  if (score >= 45) return "Médio";
  return "Baixo";
}
