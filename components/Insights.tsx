"use client";

import { AlertTriangle, ArrowUpRight, Check, ChevronDown, Flame, Lightbulb, Sparkles, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { FORMAT_LABEL, pct } from "@/lib/format";
import { hookType } from "@/lib/hooks";
import { firstLine } from "@/lib/metrics";
import type { Analysis, Destaque, MediaFormat } from "@/lib/types";
import type { TrendCategory, TrendResult } from "@/lib/trends";
import { Thumb } from "./Media";

const br = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/* ------------------------------------------------------------------ */
/* Raio-X: 4 cartões com o dado e a leitura                             */
/* ------------------------------------------------------------------ */

const TONE = {
  forte: { icon: TrendingUp, label: "Funciona", ring: "ring-emerald-400/25", chip: "bg-emerald-400/15 text-emerald-300" },
  alerta: { icon: AlertTriangle, label: "Atenção", ring: "ring-amber-400/25", chip: "bg-amber-400/15 text-amber-300" },
  oportunidade: { icon: Lightbulb, label: "Oportunidade", ring: "ring-pink-400/25", chip: "bg-pink-400/15 text-pink-300" },
} as const;

export function InsightCards({ items }: { items: Destaque[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((d, i) => {
        const t = TONE[d.tipo] ?? TONE.oportunidade;
        const I = t.icon;
        return (
          <div key={i} className={`card animate-pop p-5 ring-1 ${t.ring}`} style={{ animationDelay: `${i * 60}ms` }}>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${t.chip}`}>
              <I className="h-3 w-3" /> {t.label}
            </span>
            <p className="text-gradient mt-3 text-4xl font-extrabold leading-none tracking-tight">{d.numero}</p>
            <p className="mt-2 font-bold leading-snug">{d.titulo}</p>
            <p className="mt-1 text-sm text-white/55">{d.detalhe}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mapa de temas: quanto posta x quanto performa                         */
/* ------------------------------------------------------------------ */

function themeStats(a: Analysis) {
  const total = a.posts.length || 1;
  const base = a.quant.medianEngagement || 0.0001;
  return a.qual.temas.map((t) => {
    const key = t.nome.toLowerCase();
    const ids = a.qual.posts.filter((p) => p.tema.toLowerCase() === key || p.tema.toLowerCase().includes(key) || key.includes(p.tema.toLowerCase())).map((p) => p.id);
    const share = ids.length ? (ids.length / total) * 100 : t.percentual;
    const perf = ids.length ? median(ids.map((id) => a.quant.posts[id]?.engagementRate ?? 0)) / base : t.desempenho === "acima" ? 1.4 : t.desempenho === "abaixo" ? 0.7 : 1;
    return { nome: t.nome, share: Math.round(share), perf: Math.round(perf * 100) / 100, posts: ids.length, comentario: t.comentario };
  });
}

const QUAD = {
  forte: { label: "Seu forte", color: "#34d399", chip: "bg-emerald-400/15 text-emerald-300", tint: "rgba(52,211,153,0.06)" },
  aposte: { label: "Aposte mais", color: "#ff4f8b", chip: "bg-pink-400/15 text-pink-300", tint: "rgba(255,79,139,0.06)" },
  repense: { label: "Repense", color: "#fbbf24", chip: "bg-amber-400/15 text-amber-300", tint: "rgba(251,191,36,0.05)" },
  deixe: { label: "Deixe de lado", color: "#8b8a99", chip: "bg-white/10 text-white/60", tint: "rgba(255,255,255,0.02)" },
} as const;
type Quad = keyof typeof QUAD;
const QUAD_ORDER: Quad[] = ["forte", "aposte", "repense", "deixe"];

export function ThemeMatrix({ analysis }: { analysis: Analysis }) {
  const [hover, setHover] = useState<number | null>(null);
  const raw = useMemo(() => themeStats(analysis), [analysis]);
  const xMid = raw.length ? 100 / raw.length : 0;
  const data = useMemo(
    () =>
      raw
        .map((d) => ({ ...d, quad: (d.perf >= 1 ? (d.share >= xMid ? "forte" : "aposte") : d.share >= xMid ? "repense" : "deixe") as Quad }))
        .sort((a, b) => QUAD_ORDER.indexOf(a.quad) - QUAD_ORDER.indexOf(b.quad) || b.perf - a.perf)
        .map((d, i) => ({ ...d, n: i + 1 })),
    [raw, xMid],
  );
  if (!data.length) return null;

  const yTop = Math.max(2, ...data.map((d) => d.perf)) * 1.12;
  const xTop = Math.ceil(Math.max(30, ...data.map((d) => d.share)) * 1.12);
  const yTicks = [0, 0.5, 1, 2, 4, 8, 16].filter((t) => t <= yTop);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <div className="h-80 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 12, bottom: 18, left: -10 }}>
              <ReferenceArea x1={xMid} x2={xTop} y1={1} y2={yTop} fill={QUAD.forte.tint} stroke="none" ifOverflow="hidden" />
              <ReferenceArea x1={0} x2={xMid} y1={1} y2={yTop} fill={QUAD.aposte.tint} stroke="none" ifOverflow="hidden" />
              <ReferenceArea x1={xMid} x2={xTop} y1={0} y2={1} fill={QUAD.repense.tint} stroke="none" ifOverflow="hidden" />
              <ReferenceArea x1={0} x2={xMid} y1={0} y2={1} fill={QUAD.deixe.tint} stroke="none" ifOverflow="hidden" />
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis
                type="number"
                dataKey="share"
                domain={[0, xTop]}
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
                label={{ value: "quanto o tema aparece →", position: "insideBottom", offset: -12, fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="perf"
                scale="sqrt"
                domain={[0, yTop]}
                ticks={yTicks}
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                tickFormatter={(v) => `${br(v)}x`}
                tickLine={false}
                axisLine={false}
              />
              <ReferenceLine x={xMid} stroke="rgba(255,255,255,0.22)" strokeDasharray="4 4" />
              <ReferenceLine y={1} stroke="rgba(255,255,255,0.22)" strokeDasharray="4 4" />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="max-w-64 rounded-xl border border-white/10 bg-ink-3/95 px-3 py-2 text-xs shadow-xl">
                      <p className="font-semibold text-white">
                        {d.n}. {d.nome}
                      </p>
                      <p className="text-white/70">
                        {d.share}% dos posts · {br(d.perf)}x o engajamento típico
                      </p>
                      {d.comentario && <p className="mt-1 text-white/55">{d.comentario}</p>}
                    </div>
                  );
                }}
              />
              <Scatter
                data={data}
                isAnimationActive={false}
                onMouseEnter={(_: unknown, i: number) => setHover(data[i]?.n ?? null)}
                onMouseLeave={() => setHover(null)}
                shape={(props: { cx?: number; cy?: number; payload?: (typeof data)[number] }) => {
                  const d = props.payload!;
                  const on = hover === d.n;
                  const dim = hover != null && !on;
                  return (
                    <g style={{ cursor: "pointer", opacity: dim ? 0.35 : 1, transition: "opacity .15s" }}>
                      <circle cx={props.cx} cy={props.cy} r={on ? 15 : 12} fill={QUAD[d.quad].color} stroke="#0a0a12" strokeWidth={2} />
                      <text x={props.cx} y={props.cy} dy={4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#0a0a12">
                        {d.n}
                      </text>
                    </g>
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-white/40">
          Altura: engajamento típico do tema comparado ao do perfil (1x = igual). Linha vertical: a fatia que cada tema teria se fosse tudo igual.
        </p>
      </div>

      <ul className="space-y-1.5">
        {data.map((d) => (
          <li key={d.nome}>
            <div
              onMouseEnter={() => setHover(d.n)}
              onMouseLeave={() => setHover(null)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${hover === d.n ? "bg-white/[0.08]" : "bg-white/[0.03]"}`}
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold text-ink"
                style={{ background: QUAD[d.quad].color }}
              >
                {d.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.nome}</p>
                <p className="text-xs text-white/50">
                  {d.share}% dos posts · <b className={d.perf >= 1 ? "text-white/85" : ""}>{br(d.perf)}x</b> o típico
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${QUAD[d.quad].chip}`}>{QUAD[d.quad].label}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ranking de hooks                                                     */
/* ------------------------------------------------------------------ */

export function HookRanking({ analysis }: { analysis: Analysis }) {
  const rows = useMemo(() => {
    const base = analysis.quant.medianEngagement || 0.0001;
    const map = new Map<string, { ers: number[]; exemplo: string }>();
    for (const q of analysis.qual.posts) {
      const e = map.get(q.tipoHook) ?? { ers: [], exemplo: q.hook };
      e.ers.push(analysis.quant.posts[q.id]?.engagementRate ?? 0);
      map.set(q.tipoHook, e);
    }
    return [...map.entries()]
      .map(([tipo, v]) => ({ tipo, n: v.ers.length, rel: median(v.ers) / base, exemplo: v.exemplo }))
      .sort((a, b) => b.rel - a.rel)
      .slice(0, 6);
  }, [analysis]);
  const max = Math.max(...rows.map((r) => r.rel), 1);

  return (
    <div className="space-y-4">
      {rows.map((r, i) => (
        <div key={r.tipo} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <p className="font-semibold">
              <span className="mr-2 text-white/35">{i + 1}</span>
              {r.tipo}
            </p>
            <p className="shrink-0 text-sm">
              <b className={r.rel >= 1 ? "text-emerald-300" : "text-white/60"}>{br(r.rel)}x</b>
              <span className="ml-1 text-xs text-white/40">
                · {r.n} {r.n === 1 ? "post" : "posts"}
              </span>
            </p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div className={`h-full rounded-full ${r.rel >= 1 ? "bg-sunset" : "bg-white/25"}`} style={{ width: `${(r.rel / max) * 100}%` }} />
          </div>
          <p className="mt-1.5 line-clamp-1 text-xs italic text-white/45">&ldquo;{r.exemplo}&rdquo;</p>
        </div>
      ))}
      <p className="text-xs text-white/40">Engajamento típico dos posts com cada tipo de hook, comparado ao do perfil (1x = igual).</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chips e checklist                                                    */
/* ------------------------------------------------------------------ */

export function Chips({ items, tone = "default" }: { items: string[]; tone?: "default" | "good" | "bad" }) {
  if (!items.length) return <p className="text-sm text-white/40">Nada por aqui.</p>;
  const cls = { default: "bg-white/[0.07] text-white/85", good: "bg-emerald-400/10 text-emerald-200", bad: "bg-rose-400/10 text-rose-200" }[tone];
  const I = tone === "good" ? Check : tone === "bad" ? X : null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span key={t} className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm ${cls}`}>
          {I && <I className="h-3.5 w-3.5 shrink-0" />}
          {t}
        </span>
      ))}
    </div>
  );
}

const PRIO = { alta: "bg-rose-400", média: "bg-amber-400", baixa: "bg-white/40" } as const;

export function Checklist({ items }: { items: { titulo: string; detalhe: string; prioridade: "alta" | "média" | "baixa" }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="divide-y divide-white/[0.06]">
      {items.map((r, i) => (
        <li key={r.titulo}>
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 py-3 text-left transition hover:text-white">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.07] text-xs font-bold">{i + 1}</span>
            <span className={`h-2 w-2 shrink-0 rounded-full ${PRIO[r.prioridade] ?? PRIO.baixa}`} title={`prioridade ${r.prioridade}`} />
            <span className="flex-1 font-semibold">{r.titulo}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && <p className="animate-fade pb-4 pl-[52px] text-sm text-white/65">{r.detalhe}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Radar do nicho: o que fura a bolha no nicho x o que o perfil faz      */
/* ------------------------------------------------------------------ */

const YOU = "#9085e9";
const NICHE = "#ff4f8b";

export function NicheRadar({ analysis }: { analysis: Analysis }) {
  const [cats, setCats] = useState<TrendCategory[]>([]);
  const [cat, setCat] = useState<string>(analysis.qual.categoriaRadar ?? "");
  const [data, setData] = useState<TrendResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/trends/categories")
      .then((r) => r.json())
      .then((list: TrendCategory[]) => {
        setCats(list);
        setCat((c) => c || list[0]?.id || "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!cat) return;
    setLoading(true);
    fetch(`/api/trends?categoria=${cat}`)
      .then((r) => r.json())
      .then((j) => setData(j.items ? j : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [cat]);

  const you = useMemo(() => {
    const n = analysis.posts.length || 1;
    const fmt = new Map<MediaFormat, number>();
    const hooks = new Map<string, number>();
    analysis.posts.forEach((p) => {
      fmt.set(p.format, (fmt.get(p.format) ?? 0) + 1);
      const t = hookType(firstLine(p.caption)).tipo;
      hooks.set(t, (hooks.get(t) ?? 0) + 1);
    });
    return {
      fmt: (f: MediaFormat) => Math.round(((fmt.get(f) ?? 0) / n) * 100),
      hook: (t: string) => Math.round(((hooks.get(t) ?? 0) / n) * 100),
    };
  }, [analysis]);

  const nicheHooks = data ? data.padroes.hooks.slice(0, 4) : [];
  const nicheTotal = data?.items.length || 1;
  const formats: MediaFormat[] = ["REEL", "CAROUSEL", "IMAGE", "VIDEO"];
  const shownFormats = formats.filter((f) => you.fmt(f) > 0 || data?.padroes.formatos.some((x) => x.format === f));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/50">
            <Flame className="h-3.5 w-3.5 text-pink-400" /> Radar do nicho
          </p>
          <h3 className="mt-1 text-lg font-bold">O que fura a bolha no nicho x o que o perfil faz</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold outline-none"
            aria-label="Categoria do Radar"
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id} className="bg-ink-2">
                {c.nome}
              </option>
            ))}
          </select>
          <Link href={`/radar?c=${cat}`} className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10">
            Abrir no Radar <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {loading && !data && <div className="h-48 animate-pulse rounded-2xl bg-white/[0.04]" />}

      {data && (
        <div className={`grid gap-6 lg:grid-cols-2 ${loading ? "opacity-60" : ""}`}>
          {/* Formatos */}
          <div>
            <div className="mb-3 flex items-center gap-4 text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: NICHE }} /> O que fura no nicho
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: YOU }} /> Esse perfil
              </span>
            </div>
            <div className="space-y-4">
              {shownFormats.map((f) => {
                const n = data.padroes.formatos.find((x) => x.format === f)?.share ?? 0;
                const y = you.fmt(f);
                return (
                  <div key={f}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold">{FORMAT_LABEL[f]}</span>
                      <span className="text-white/60">
                        {n}% · {y}%
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full" style={{ width: `${n}%`, background: NICHE }} />
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full" style={{ width: `${y}%`, background: YOU }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {data.padroes.furoMedio != null && (
              <p className="mt-5 rounded-2xl bg-white/[0.04] p-3 text-sm text-white/75">
                No nicho, o que furou a bolha teve em média <b className="text-white">{br(data.padroes.furoMedio)}x</b> mais views que seguidores.
                {analysis.quant.reelsReachRatio != null && (
                  <>
                    {" "}
                    Os Reels desse perfil: <b className="text-white">{br(analysis.quant.reelsReachRatio)}x</b>.
                  </>
                )}
              </p>
            )}
          </div>

          {/* Hooks */}
          <div>
            <p className="mb-3 text-xs text-white/60">Hooks que mais aparecem no que furou a bolha</p>
            <div className="space-y-2">
              {nicheHooks.map((h) => {
                const nShare = Math.round((h.count / nicheTotal) * 100);
                const yShare = you.hook(h.tipo);
                const gap = yShare < nShare / 2;
                return (
                  <div key={h.tipo} className={`flex items-center gap-3 rounded-2xl p-3 ${gap ? "bg-pink-500/10 ring-1 ring-pink-400/20" : "bg-white/[0.04]"}`}>
                    <div className="flex-1">
                      <p className="font-semibold">{h.tipo}</p>
                      <p className="text-xs text-white/55">
                        {nShare}% do nicho · {yShare}% desse perfil
                      </p>
                    </div>
                    {gap ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-pink-400/15 px-2 py-1 text-[11px] font-bold text-pink-200">
                        <Sparkles className="h-3 w-3" /> Testar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-1 text-[11px] font-bold text-emerald-300">
                        <Check className="h-3 w-3" /> Já usa
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conteúdos */}
          <div className="lg:col-span-2">
            <p className="mb-3 text-xs text-white/60">Pra se inspirar: o que mais furou a bolha no nicho</p>
            <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {data.items.slice(0, 8).map((it) => (
                <a key={it.id} href={it.permalink} target="_blank" rel="noreferrer" className="group w-32 shrink-0">
                  <div className="relative">
                    <Thumb post={{ ...it, caption: it.hook }} className="aspect-[4/5] w-full rounded-2xl ring-1 ring-white/10 transition group-hover:ring-white/30" showPlay />
                    {it.furo != null && (
                      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold backdrop-blur">{br(it.furo)}x</span>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-white/60">{it.hook}</p>
                </a>
              ))}
            </div>
            {data.source === "demo" && <p className="mt-2 text-xs text-amber-200/70">Dados de demonstração do Radar.</p>}
          </div>
        </div>
      )}
      {!loading && !data && <p className="text-sm text-white/50">Não deu pra carregar o Radar dessa categoria agora.</p>}
    </div>
  );
}

export { pct };
