"use client";

import {
  AlertTriangle,
  AtSign,
  BadgeCheck,
  Building2,
  CalendarCheck,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Gem,
  Globe,
  Handshake,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Scale,
  Search,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FORMAT_LABEL, compact, pct, times } from "@/lib/format";
import type { AfiliadosData, MarcasData, MonetResult, PublisData, Secao } from "@/lib/monetizacao";
import type { Analysis } from "@/lib/types";
import { Card } from "./ui";

/* ------------------------------------------------------------------ */
/* Estado compartilhado (dashboard e apresentação)                      */
/* ------------------------------------------------------------------ */

export interface MonetState {
  marcas: MonetResult<MarcasData> | null;
  afiliados: MonetResult<AfiliadosData> | null;
  publis: MonetResult<PublisData> | null;
}

const LS = (h: string) => `perfilab:monet:${h}`;

export function useMonet(analysis: Analysis) {
  const handle = analysis.handle;
  const [data, setData] = useState<MonetState>({ marcas: null, afiliados: null, publis: null });
  const [loading, setLoading] = useState<Record<Secao, boolean>>({ marcas: false, afiliados: false, publis: false });
  const [errors, setErrors] = useState<Partial<Record<Secao, string>>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS(handle));
      if (raw) setData(JSON.parse(raw));
    } catch {
      /* sem cache local */
    }
    fetch(`/api/monetizacao?handle=${encodeURIComponent(handle)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: MonetState | null) => {
        if (!j) return;
        setData((cur) => {
          const next = { marcas: j.marcas ?? cur.marcas, afiliados: j.afiliados ?? cur.afiliados, publis: j.publis ?? cur.publis } as MonetState;
          try {
            localStorage.setItem(LS(handle), JSON.stringify(next));
          } catch {
            /* ok */
          }
          return next;
        });
      })
      .catch(() => {});
  }, [handle]);

  const run = useCallback(
    async (secao: Secao) => {
      setLoading((l) => ({ ...l, [secao]: true }));
      setErrors((e) => ({ ...e, [secao]: undefined }));
      try {
        const res = await fetch("/api/monetizacao", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ handle, secao, analysis }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "Erro na pesquisa.");
        setData((cur) => {
          const next = { ...cur, [secao]: j };
          try {
            localStorage.setItem(LS(handle), JSON.stringify(next));
          } catch {
            /* ok */
          }
          return next;
        });
      } catch (e) {
        setErrors((er) => ({ ...er, [secao]: e instanceof Error ? e.message : "Erro na pesquisa." }));
      } finally {
        setLoading((l) => ({ ...l, [secao]: false }));
      }
    },
    [handle, analysis],
  );

  return { data, loading, errors, run };
}

/** Recomendações com pelo menos um passo de monetização. */
export function withMonetStep(recs: Analysis["qual"]["recomendacoes"], data: MonetState) {
  const temMonet = recs.some((r) => /publi|marca|monetiz|afiliad|permuta|m[ií]dia ?kit|parceri|cobrar/i.test(`${r.titulo} ${r.detalhe}`));
  const passo = data.publis?.data.passoMonetizacao;
  if (temMonet || !passo?.titulo) return recs;
  return [recs[0], { titulo: passo.titulo, detalhe: passo.detalhe, prioridade: "alta" as const }, ...recs.slice(1)].filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Peças pequenas                                                       */
/* ------------------------------------------------------------------ */

const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1600);
      }}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/15 active:scale-95"
    >
      {ok ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />} {ok ? "Copiado!" : label}
    </button>
  );
}

function Bubble({ children, copy }: { children: ReactNode; copy?: string }) {
  return (
    <div>
      <div className="whitespace-pre-line rounded-3xl rounded-bl-md bg-gradient-to-br from-pink-500/20 to-purple-500/15 p-4 text-[15px] leading-relaxed text-white/90 ring-1 ring-pink-400/20">
        {children}
      </div>
      {copy && (
        <div className="mt-2">
          <CopyButton text={copy} />
        </div>
      )}
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((s, i) => (
        <li key={i} className="flex gap-3 text-sm text-white/80">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[11px] font-bold">{i + 1}</span>
          <span className="pt-0.5">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function Mini({ title, icon: I, children }: { title: string; icon: typeof Check; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold">
        <I className="h-4 w-4 text-pink-300" /> {title}
      </p>
      {children}
    </div>
  );
}

function Checks({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-white/40">Nada por aqui.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm text-white/75">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
          {t}
        </li>
      ))}
    </ul>
  );
}

function SectionShell({
  n,
  icon: I,
  title,
  subtitle,
  result,
  loading,
  error,
  onRun,
  cta,
  children,
}: {
  n: number;
  icon: typeof Check;
  title: string;
  subtitle: string;
  result: { consultadoEm: string } | null;
  loading: boolean;
  error?: string;
  onRun: () => void;
  cta: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sunset">
            <I className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Monetização · {n} de 3</p>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-sm text-white/55">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              <CalendarCheck className="h-3 w-3" /> Consultado em {dataBR(result.consultadoEm)}
            </span>
          )}
          <button
            onClick={onRun}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-60 ${result ? "bg-white/[0.08] text-white/80 hover:bg-white/15" : "bg-sunset text-white hover:brightness-110"}`}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {loading ? "Pesquisando..." : result ? "Pesquisar de novo" : cta}
          </button>
        </div>
      </div>
      {error && <p className="mb-4 rounded-2xl bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
      {loading && !result && (
        <div className="space-y-3">
          <p className="text-sm text-white/55">Pesquisando na web e conferindo as fontes. Leva de 1 a 4 minutos.</p>
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.05]" />
            ))}
          </div>
        </div>
      )}
      {!loading && !result && !error && (
        <p className="rounded-2xl bg-white/[0.03] p-4 text-sm text-white/50">Ainda não pesquisado. Clique no botão pra gerar com dados confirmados na web.</p>
      )}
      {result && <div className={loading ? "opacity-50" : ""}>{children}</div>}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Seção 1: Marcas com sinergia                                         */
/* ------------------------------------------------------------------ */

type Marca = MarcasData["locais"][number];

function contactIcon(tipo: string) {
  const t = tipo.toLowerCase();
  if (t.includes("mail")) return Mail;
  if (t.includes("insta")) return AtSign;
  if (t.includes("agên") || t.includes("agen")) return Building2;
  if (t.includes("plata")) return Handshake;
  return Globe;
}

function BrandCard({ m }: { m: Marca }) {
  const CI = contactIcon(m.contato.tipo);
  return (
    <div className="rounded-2xl bg-white/[0.04] p-4 transition hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold leading-tight">{m.nome}</p>
          {m.instagram && (
            <a href={`https://www.instagram.com/${m.instagram.replace(/^@/, "")}/`} target="_blank" rel="noreferrer" className="text-xs text-white/50 hover:text-white">
              @{m.instagram.replace(/^@/, "")}
            </a>
          )}
        </div>
        {m.jaTrabalhou && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            <BadgeCheck className="h-3 w-3" /> Já marcou
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-white/70">{m.porque}</p>
      {m.conteudo && (
        <p className="mt-2 flex gap-1.5 text-sm text-pink-100/90">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-300" />
          {m.conteudo}
        </p>
      )}
      {m.contato.valor && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-white/75">
            <CI className="h-3.5 w-3.5 text-white/50" />
            {m.contato.valor}
          </span>
          {m.contato.fonte && (
            <a href={m.contato.fonte} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-white/40 hover:text-white">
              fonte <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

const GRUPOS = [
  { key: "locais", label: "Locais", hint: "Da sua cidade", icon: Store },
  { key: "nacionais", label: "Nacionais acessíveis", hint: "Já trabalham com micro e nano", icon: Handshake },
  { key: "sonho", label: "Marcas sonho", hint: "Pra mirar no médio prazo", icon: Gem },
] as const;

function MarcasBody({ r, analysis }: { r: MonetResult<MarcasData>; analysis: Analysis }) {
  const d = r.data;
  const publis = r.ctx.publis.slice(0, 3);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 font-semibold">
          <MapPin className="h-3.5 w-3.5 text-pink-300" />
          {d.cidade.nome ? `${d.cidade.nome} · ${d.cidade.fonte}` : "Cidade não encontrada"}
        </span>
        <span className="rounded-full bg-white/[0.07] px-3 py-1.5 font-semibold">
          {r.ctx.mencionadas.length} perfis marcados · {r.ctx.publis.length} publis nos últimos {analysis.posts.length} posts
        </span>
      </div>

      {(publis.length > 0 || d.jaPerformou.length > 0) && (
        <div>
          <p className="mb-3 text-sm font-bold">O que já performou em publi</p>
          <div className="grid gap-3 md:grid-cols-3">
            {publis.map((p) => (
              <a key={p.id} href={p.permalink} target="_blank" rel="noreferrer" className="rounded-2xl bg-white/[0.04] p-4 transition hover:bg-white/[0.07]">
                <p className={`text-3xl font-extrabold ${p.vsTipico >= 1 ? "text-gradient" : "text-white/60"}`}>{times(p.vsTipico)}</p>
                <p className="text-xs text-white/50">
                  o seu engajamento típico · {FORMAT_LABEL[p.format as keyof typeof FORMAT_LABEL] ?? p.format}
                  {p.views != null && ` · ${compact(p.views)} views`}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-white/80">&ldquo;{p.hook}&rdquo;</p>
                {p.marcas.length > 0 && <p className="mt-1 truncate text-xs text-white/45">{p.marcas.map((m) => "@" + m).join(" ")}</p>}
              </a>
            ))}
          </div>
          {d.jaPerformou.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {d.jaPerformou.map((j, i) => (
                <li key={i} className="flex gap-2 text-sm text-white/70">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>
                    <b className="text-white">{j.marca}:</b> {j.resumo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {GRUPOS.map((g) => {
          const list = d[g.key];
          const I = g.icon;
          return (
            <div key={g.key}>
              <div className="mb-3 flex items-center gap-2">
                <I className="h-4 w-4 text-pink-300" />
                <p className="font-bold">{g.label}</p>
                <span className="text-xs text-white/40">{g.hint}</span>
              </div>
              <div className="space-y-3">
                {list.length ? list.map((m) => <BrandCard key={m.nome} m={m} />) : <p className="rounded-2xl bg-white/[0.03] p-4 text-sm text-white/45">Nenhuma marca confirmada nesse grupo.</p>}
              </div>
            </div>
          );
        })}
      </div>

      {d.dica && (
        <p className="flex gap-2 rounded-2xl bg-pink-500/10 p-4 text-sm text-pink-100 ring-1 ring-pink-400/20">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" /> {d.dica}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Seção 2: Permuta e afiliados                                         */
/* ------------------------------------------------------------------ */

function aceitaTone(v: string) {
  const t = v.toLowerCase();
  if (t.startsWith("sim")) return "bg-emerald-400/15 text-emerald-300";
  if (t.startsWith("não") || t.startsWith("nao")) return "bg-rose-400/15 text-rose-300";
  return "bg-white/10 text-white/60";
}

function AfiliadosBody({ r }: { r: MonetResult<AfiliadosData> }) {
  const d = r.data;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        {d.programas.map((p) => (
          <div key={p.nome} className="flex flex-col rounded-2xl bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-bold">{p.nome}</p>
              <div className="flex gap-1.5">
                {p.tipo && <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">{p.tipo}</span>}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${aceitaTone(p.aceitaPequenos)}`}>Perfis pequenos: {p.aceitaPequenos || "não informado"}</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-white/70">{p.oQueE}</p>
            {p.beneficio && (
              <p className="mt-2 flex gap-1.5 text-sm text-white/85">
                <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> {p.beneficio}
              </p>
            )}
            {p.porqueCombina && <p className="mt-2 text-xs text-pink-100/80">{p.porqueCombina}</p>}
            {p.passos.length > 0 && (
              <details className="group mt-3">
                <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-white/60 hover:text-white">
                  Passo a passo pra se cadastrar <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                </summary>
                <div className="mt-3">
                  <Steps items={p.passos} />
                </div>
              </details>
            )}
            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              {p.link && (
                <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-sunset px-3 py-1.5 text-xs font-bold transition hover:brightness-110 active:scale-95">
                  <Link2 className="h-3.5 w-3.5" /> Página oficial
                </a>
              )}
              {p.fonte && p.fonte !== p.link && (
                <a href={p.fonte} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/15">
                  Regras <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
        {!d.programas.length && <p className="text-sm text-white/45">Nenhum programa confirmado nessa pesquisa.</p>}
      </div>

      <div className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/[0.06]">
        <p className="mb-4 flex items-center gap-2 font-bold">
          <Store className="h-4 w-4 text-pink-300" /> Como pedir permuta pra loja da sua cidade
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {d.permuta.alvos.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">Onde procurar</p>
                <div className="flex flex-wrap gap-2">
                  {d.permuta.alvos.map((a) => (
                    <span key={a} className="rounded-2xl bg-white/[0.07] px-3 py-1.5 text-sm">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">Roteiro</p>
              <Steps items={d.permuta.passos} />
            </div>
            {d.permuta.oQueOferecer.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">O que oferecer</p>
                <Checks items={d.permuta.oQueOferecer} />
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/45">
              <MessageCircle className="h-3.5 w-3.5" /> Mensagem pronta de DM
            </p>
            {d.permuta.mensagem ? <Bubble copy={d.permuta.mensagem}>{d.permuta.mensagem}</Bubble> : <p className="text-sm text-white/45">Sem mensagem.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Seção 3: Como atrair e fechar publis                                 */
/* ------------------------------------------------------------------ */

/** Números do mídia kit, sempre vindos da análise (nunca da IA). */
export function mediaKitNumbers(a: Analysis, best: MonetResult<PublisData>["ctx"]["melhorPubli"] | undefined) {
  const fmt = [...a.quant.byFormat].sort((x, y) => y.avgEngagement - x.avgEngagement)[0];
  const rows: { label: string; value: string }[] = [
    { label: "Seguidores", value: compact(a.profile.followers) },
    { label: "Engajamento típico", value: pct(a.quant.medianEngagement) },
  ];
  if (a.quant.avgReelViews != null) rows.push({ label: "Views médias dos Reels", value: compact(a.quant.avgReelViews) });
  if (a.quant.reelsReachRatio != null) rows.push({ label: "Views vs. seguidores", value: times(a.quant.reelsReachRatio) });
  if (fmt) rows.push({ label: "Formato que mais engaja", value: FORMAT_LABEL[fmt.format] });
  if (best) rows.push({ label: "Melhor publi", value: `${times(best.vsTipico)} o típico` });
  if (a.privado?.nonFollowerShare != null) rows.push({ label: "Alcance de não seguidores", value: pct(a.privado.nonFollowerShare, 0) });
  const city = a.privado?.demographics.city[0];
  if (city) rows.push({ label: "Cidade principal do público", value: city.label });
  const gender = a.privado?.demographics.gender;
  if (gender?.length) {
    const tot = gender.reduce((s, g) => s + g.value, 0) || 1;
    const top = [...gender].sort((x, y) => y.value - x.value)[0];
    rows.push({ label: "Público", value: `${Math.round((top.value / tot) * 100)}% ${top.label.toLowerCase()}` });
  }
  return rows;
}

function PublisBody({ r, analysis }: { r: MonetResult<PublisData>; analysis: Analysis }) {
  const d = r.data;
  const kit = mediaKitNumbers(analysis, r.ctx.melhorPubli);
  const kitText = [`Mídia kit · @${analysis.profile.username}`, ...kit.map((k) => `${k.label}: ${k.value}`), d.abordagem.caseResumo ? `Case: ${d.abordagem.caseResumo}` : ""]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="space-y-6">
      {/* Perfil pronto */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Mini title="Bio sugerida" icon={AtSign}>
          {d.perfil.bio ? <Bubble copy={d.perfil.bio}>{d.perfil.bio}</Bubble> : <p className="text-sm text-white/45">Sem sugestão.</p>}
          {analysis.profile.bio && <p className="mt-3 text-xs text-white/40">Hoje: {analysis.profile.bio.split("\n").join(" · ")}</p>}
        </Mini>
        <Mini title="Destaques fixos" icon={BadgeCheck}>
          <Checks items={d.perfil.destaques} />
        </Mini>
        <Mini title="Link na bio" icon={Link2}>
          <Checks items={d.perfil.linkNaBio} />
        </Mini>
      </div>

      {/* Mídia kit */}
      <div className="rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 ring-1 ring-white/10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 font-bold">
            <Megaphone className="h-4 w-4 text-pink-300" /> Seu mídia kit, com os seus números reais
          </p>
          <CopyButton text={kitText} label="Copiar números" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kit.map((k) => (
            <div key={k.label} className="rounded-2xl bg-black/20 p-3">
              <p className="text-xl font-extrabold">{k.value}</p>
              <p className="text-[11px] text-white/50">{k.label}</p>
            </div>
          ))}
        </div>
        {d.perfil.midiaKit.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">O que colocar, nessa ordem</p>
            <Steps items={d.perfil.midiaKit} />
          </div>
        )}
        {!analysis.privado && (
          <p className="mt-3 text-xs text-white/40">Idade, gênero e cidade do público entram aqui quando o perfil autorizar a análise completa (opt-in).</p>
        )}
      </div>

      {/* Abordagem */}
      <div>
        <p className="mb-3 flex items-center gap-2 font-bold">
          <MessageCircle className="h-4 w-4 text-pink-300" /> Como abordar uma marca
        </p>
        {d.abordagem.caseResumo && (
          <p className="mb-4 flex gap-2 rounded-2xl bg-emerald-400/10 p-3 text-sm text-emerald-100 ring-1 ring-emerald-400/20">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" /> <span><b>Seu case:</b> {d.abordagem.caseResumo}</span>
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">DM</p>
            <Bubble copy={d.abordagem.dm}>{d.abordagem.dm}</Bubble>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">E-mail</p>
            <div className="rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10">
              <p className="text-sm">
                <span className="text-white/45">Assunto: </span>
                <b>{d.abordagem.emailAssunto}</b>
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/80">{d.abordagem.emailCorpo}</p>
            </div>
            <div className="mt-2">
              <CopyButton text={`Assunto: ${d.abordagem.emailAssunto}\n\n${d.abordagem.emailCorpo}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Preço */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-3xl bg-white/[0.04] p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
            <Wallet className="h-3.5 w-3.5 text-amber-300" /> Quanto cobrar (referência)
          </p>
          <p className="text-gradient mt-2 text-3xl font-extrabold leading-tight">{d.preco.faixa || "Sem referência confirmada"}</p>
          {d.preco.porFormato.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {d.preco.porFormato.map((f) => (
                <li key={f.formato} className="flex justify-between gap-3 text-sm">
                  <span className="text-white/60">{f.formato}</span>
                  <b>{f.faixa}</b>
                </li>
              ))}
            </ul>
          )}
          {d.preco.aviso && (
            <p className="mt-4 flex gap-2 rounded-2xl bg-amber-400/10 p-3 text-xs text-amber-100">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {d.preco.aviso}
            </p>
          )}
        </div>
        <div className="space-y-3">
          {d.preco.argumento && (
            <p className="flex gap-2 rounded-2xl bg-pink-500/10 p-4 text-sm text-pink-50 ring-1 ring-pink-400/20">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-pink-300" /> {d.preco.argumento}
            </p>
          )}
          {d.preco.fontes.length > 0 && (
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">Fontes do preço</p>
              <ul className="space-y-1.5">
                {d.preco.fontes.map((f) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-sm text-white/75 hover:text-white">
                      <ExternalLink className="mt-1 h-3 w-3 shrink-0" />
                      <span>
                        {f.titulo}
                        {f.data && <span className="text-white/40"> · {f.data}</span>}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Entrega */}
      <div>
        <p className="mb-3 flex items-center gap-2 font-bold">
          <CalendarCheck className="h-4 w-4 text-pink-300" /> Como entregar bem e virar parceria recorrente
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Mini title="Briefing" icon={Check}>
            <Checks items={d.entrega.briefing} />
          </Mini>
          <Mini title="Prazos" icon={CalendarCheck}>
            <Checks items={d.entrega.prazos} />
          </Mini>
          <Mini title="Aprovação" icon={BadgeCheck}>
            <Checks items={d.entrega.aprovacao} />
          </Mini>
          <Mini title="Relatório depois" icon={Megaphone}>
            <Checks items={d.entrega.relatorio} />
          </Mini>
        </div>
      </div>

      {/* CONAR */}
      <div className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/[0.06]">
        <p className="mb-3 flex items-center gap-2 font-bold">
          <Scale className="h-4 w-4 text-pink-300" /> Regras de publicidade: sempre sinalize a publi
        </p>
        <Checks items={d.regras.pontos} />
        {d.regras.guia.url && (
          <a href={d.regras.guia.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white/75 hover:text-white">
            <ExternalLink className="h-3.5 w-3.5" /> {d.regras.guia.nome}
            {d.regras.guia.versao && ` · ${d.regras.guia.versao}`}
          </a>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bloco completo                                                       */
/* ------------------------------------------------------------------ */

export function MonetizacaoSections({ analysis, monet }: { analysis: Analysis; monet: ReturnType<typeof useMonet> }) {
  const { data, loading, errors, run } = monet;
  const isDemo = analysis.source === "demo";
  const anyLoading = loading.marcas || loading.afiliados || loading.publis;
  const missing = [
    ...(data.marcas?.data.naoEncontrado ?? []).map((t) => ({ s: "Marcas", t })),
    ...(data.afiliados?.data.naoEncontrado ?? []).map((t) => ({ s: "Afiliados", t })),
    ...(data.publis?.data.naoEncontrado ?? []).map((t) => ({ s: "Publis", t })),
  ];
  if (!data.marcas?.data.cidade.nome && data.marcas) missing.unshift({ s: "Marcas", t: "Cidade do perfil (sem dados internos do público)." });
  const fontes = [...new Map([...(data.marcas?.fontes ?? []), ...(data.afiliados?.fontes ?? []), ...(data.publis?.fontes ?? [])].map((f) => [f.url, f])).values()];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-transparent p-5 ring-1 ring-pink-400/15">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-pink-200">
            <Wallet className="h-3.5 w-3.5" /> Monetização
          </p>
          <p className="mt-1 text-lg font-bold">Como transformar esse perfil em renda</p>
          <p className="text-sm text-white/55">Marcas, programas e preços pesquisados na web na hora, com fonte e data. Cada pesquisa leva de 1 a 4 minutos.</p>
        </div>
        {!isDemo && (
          <button
            onClick={() => (["marcas", "afiliados", "publis"] as Secao[]).forEach((s) => !loading[s] && run(s))}
            disabled={anyLoading}
            className="inline-flex items-center gap-2 rounded-full bg-sunset px-5 py-2.5 text-sm font-bold shadow-lg shadow-pink-500/20 transition hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            {anyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {anyLoading ? "Pesquisando..." : data.marcas && data.afiliados && data.publis ? "Atualizar as 3" : "Gerar as 3 seções"}
          </button>
        )}
      </div>

      {isDemo ? (
        <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-white/55">A pesquisa de monetização só roda com perfis reais, porque ela usa as marcas e os números de verdade do perfil.</p>
      ) : (
        <>
          <SectionShell
            n={1}
            icon={Handshake}
            title="Marcas com sinergia"
            subtitle="Quem combina com o seu nicho, o seu público e a sua cidade."
            result={data.marcas}
            loading={loading.marcas}
            error={errors.marcas}
            onRun={() => run("marcas")}
            cta="Pesquisar marcas"
          >
            {data.marcas && <MarcasBody r={data.marcas} analysis={analysis} />}
          </SectionShell>

          <SectionShell
            n={2}
            icon={Store}
            title="Permuta e programas de afiliados"
            subtitle="Onde se cadastrar e como pedir permuta, com links oficiais."
            result={data.afiliados}
            loading={loading.afiliados}
            error={errors.afiliados}
            onRun={() => run("afiliados")}
            cta="Pesquisar programas"
          >
            {data.afiliados && <AfiliadosBody r={data.afiliados} />}
          </SectionShell>

          <SectionShell
            n={3}
            icon={Megaphone}
            title="Como atrair e fechar publis"
            subtitle="Perfil pronto, mídia kit, abordagem, preço, entrega e regras."
            result={data.publis}
            loading={loading.publis}
            error={errors.publis}
            onRun={() => run("publis")}
            cta="Montar o guia de publis"
          >
            {data.publis && <PublisBody r={data.publis} analysis={analysis} />}
          </SectionShell>

          {(missing.length > 0 || fontes.length > 0) && (
            <Card>
              {missing.length > 0 && (
                <>
                  <p className="mb-3 flex items-center gap-2 font-bold">
                    <AlertTriangle className="h-4 w-4 text-amber-300" /> O que não encontramos ou precisou ser estimado
                  </p>
                  <ul className="space-y-1.5">
                    {missing.map((m, i) => (
                      <li key={i} className="flex gap-2 text-sm text-white/70">
                        <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-bold uppercase text-white/55">{m.s}</span>
                        {m.t}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {fontes.length > 0 && (
                <details className="group mt-4">
                  <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-white/60 hover:text-white">
                    Todas as fontes consultadas ({fontes.length}) <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {fontes.map((f) => (
                      <li key={f.url} className="truncate">
                        <a href={f.url} target="_blank" rel="noreferrer" className="text-xs text-white/55 hover:text-white">
                          {f.titulo}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
