"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useRef, useState, type ReactNode } from "react";
import { Loading } from "@/components/Loading";
import { proxied } from "@/components/Media";
import { Thumb } from "@/components/PostGrid";
import { Avatar, ScoreRing } from "@/components/ui";
import { useAnalysis } from "@/components/useAnalysis";
import { FORMAT_LABEL, compact, pct, scoreLabel, times } from "@/lib/format";
import type { Analysis } from "@/lib/types";

const W = 1280;
const SH = 720;

function Slide({ children, n, total, handle }: { children: ReactNode; n: number; total: number; handle: string }) {
  return (
    <div className="slide relative overflow-hidden rounded-3xl bg-ink" style={{ width: W, height: SH }}>
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#8a3ab9]/25 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 -left-32 h-[480px] w-[480px] rounded-full bg-[#ff5f6d]/20 blur-[120px]" />
      <div className="relative flex h-full flex-col p-16">{children}</div>
      <div className="absolute inset-x-16 bottom-8 flex justify-between text-sm text-white/35">
        <span>@{handle} · perfilab</span>
        <span>
          {n}/{total}
        </span>
      </div>
    </div>
  );
}

function H({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-pink-300/80">{eyebrow}</p>
      <h2 className="text-5xl font-extrabold leading-tight tracking-tight">{children}</h2>
    </div>
  );
}

function buildSlides(a: Analysis): ReactNode[] {
  const { profile, quant, qual, bubble } = a;
  const date = new Date(a.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const maxFmt = Math.max(...quant.byFormat.map((f) => f.avgEngagement), 0.01);

  return [
    // 1. Capa
    <div key="capa" className="flex h-full flex-col justify-center">
      <Avatar src={proxied(`avatar_${profile.username}`, profile.avatar)} name={profile.name} size={128} />
      <p className="mt-10 text-lg font-bold uppercase tracking-[0.25em] text-white/50">Raio-X do perfil</p>
      <h1 className="mt-3 text-7xl font-extrabold tracking-tight">
        <span className="text-gradient">@{profile.username}</span>
      </h1>
      <p className="mt-4 text-2xl text-white/65">{profile.name}</p>
      <p className="mt-10 text-lg text-white/40">{date}</p>
    </div>,

    // 1b. Raio-X
    ...(qual.destaques?.length
      ? [
          <div key="raiox">
            <H eyebrow="Raio-X">O que mais importa</H>
            <div className="grid grid-cols-2 gap-5">
              {qual.destaques.slice(0, 4).map((d) => (
                <div key={d.titulo} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
                  <p
                    className={`text-sm font-bold uppercase tracking-wider ${d.tipo === "forte" ? "text-emerald-300" : d.tipo === "alerta" ? "text-amber-300" : "text-pink-300"}`}
                  >
                    {d.tipo === "forte" ? "Funciona" : d.tipo === "alerta" ? "Atenção" : "Oportunidade"}
                  </p>
                  <p className="text-gradient mt-2 text-6xl font-extrabold tracking-tight">{d.numero}</p>
                  <p className="mt-3 text-2xl font-bold">{d.titulo}</p>
                  <p className="mt-1 text-lg text-white/60">{d.detalhe}</p>
                </div>
              ))}
            </div>
          </div>,
        ]
      : []),

    // 2. Números
    <div key="numeros">
      <H eyebrow="Os números">O perfil hoje</H>
      <div className="grid grid-cols-3 gap-5">
        {[
          { l: "Seguidores", v: compact(profile.followers) },
          { l: "Posts por semana", v: quant.postsPerWeek.toLocaleString("pt-BR") },
          { l: "Engajamento médio", v: pct(quant.avgEngagement) },
          { l: "Curtidas por post", v: compact(quant.avgLikes) },
          { l: "Views médias dos Reels", v: compact(quant.avgReelViews) },
          { l: "Views vs. seguidores", v: times(quant.reelsReachRatio) },
        ].map((s) => (
          <div key={s.l} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <p className="text-lg text-white/55">{s.l}</p>
            <p className="mt-2 text-5xl font-extrabold tracking-tight">{s.v}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-lg text-white/45">
        Base: {quant.postsAnalyzed} posts dos últimos {quant.periodDays} dias.
      </p>
    </div>,

    // 2b. Dados internos (opt-in)
    ...(a.privado
      ? [
          <div key="privado">
            <H eyebrow="Dados internos (autorizados)">Pra quem o conteúdo chega</H>
            <div className="grid grid-cols-4 gap-5">
              {[
                { l: "Alcance de não seguidores", v: pct(a.privado.nonFollowerShare, 0) },
                { l: "Envios por alcance", v: pct(a.privado.sendsPerReach) },
                { l: "Salvamentos por alcance", v: pct(a.privado.savesPerReach) },
                { l: "Tempo médio nos Reels", v: a.privado.avgWatchTimeSec != null ? `${a.privado.avgWatchTimeSec.toLocaleString("pt-BR")}s` : "—" },
              ].map((s) => (
                <div key={s.l} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                  <p className="text-base text-white/55">{s.l}</p>
                  <p className="mt-2 text-5xl font-extrabold tracking-tight">{s.v}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-3 gap-8">
              {(
                [
                  ["Idade", a.privado.demographics.age],
                  ["Gênero", a.privado.demographics.gender],
                  ["Cidades", a.privado.demographics.city.slice(0, 4)],
                ] as const
              ).map(([t, rows]) => {
                const total = rows.reduce((x, r) => x + r.value, 0) || 1;
                return (
                  <div key={t}>
                    <p className="mb-3 text-lg font-bold text-white/60">{t}</p>
                    {rows.slice(0, 4).map((r) => (
                      <div key={r.label} className="mb-2">
                        <div className="flex justify-between text-base">
                          <span>{r.label}</span>
                          <span className="font-bold">{pct((r.value / total) * 100, 0)}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                          <div className="h-full rounded-full bg-sunset" style={{ width: `${(r.value / total) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>,
        ]
      : []),

    // 3. Formatos
    <div key="formatos">
      <H eyebrow="Formatos">O que mais engaja</H>
      <div className="space-y-6">
        {quant.byFormat.map((f) => (
          <div key={f.format}>
            <div className="mb-2 flex items-baseline justify-between text-2xl">
              <span className="font-bold">{FORMAT_LABEL[f.format]}</span>
              <span className="text-white/60">
                {f.count} posts · <b className="text-white">{pct(f.avgEngagement)}</b>
                {f.avgViewsPerFollower != null && <> · views {times(f.avgViewsPerFollower)} seguidores</>}
              </span>
            </div>
            <div className="h-5 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-sunset" style={{ width: `${(f.avgEngagement / maxFmt) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>,

    // 4. Nicho e posicionamento
    <div key="nicho">
      <H eyebrow="Nicho e posicionamento">{qual.nicho.principal}</H>
      <div className="grid grid-cols-2 gap-6 text-xl">
        <div className="space-y-5">
          <div>
            <p className="text-base font-bold uppercase tracking-wider text-white/45">Proposta</p>
            <p className="mt-1 text-white/90">{qual.posicionamento.proposta}</p>
          </div>
          <div>
            <p className="text-base font-bold uppercase tracking-wider text-white/45">Público</p>
            <p className="mt-1 text-white/90">{qual.posicionamento.publico}</p>
          </div>
          <div>
            <p className="text-base font-bold uppercase tracking-wider text-white/45">Tom</p>
            <p className="mt-1 text-white/90">{qual.posicionamento.tom}</p>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
          <p className="text-base font-bold uppercase tracking-wider text-white/45">Clareza do nicho</p>
          <p className="mt-1 text-6xl font-extrabold">
            {qual.nicho.clareza.toLocaleString("pt-BR")}
            <span className="text-3xl text-white/40">/10</span>
          </p>
          <p className="mt-3 text-lg text-white/70">{qual.nicho.comentario}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {qual.nicho.subnichos.map((s) => (
              <span key={s} className="rounded-full bg-white/10 px-3 py-1 text-base">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>,

    // 5. Temas
    <div key="temas">
      <H eyebrow="Temas">Do que o perfil fala</H>
      <div className="grid grid-cols-2 gap-x-10 gap-y-6">
        {qual.temas.slice(0, 6).map((t) => (
          <div key={t.nome}>
            <div className="mb-2 flex items-baseline justify-between text-2xl">
              <span className="font-bold">{t.nome}</span>
              <span className="text-white/60">{t.percentual}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-sunset" style={{ width: `${Math.min(100, t.percentual)}%` }} />
            </div>
            <p
              className={`mt-2 text-base font-semibold ${t.desempenho === "acima" ? "text-emerald-300" : t.desempenho === "abaixo" ? "text-rose-300" : "text-white/50"}`}
            >
              {t.desempenho === "na média" ? "Performa na média" : `Performa ${t.desempenho} da média`}
            </p>
          </div>
        ))}
      </div>
    </div>,

    // 6. Hooks
    <div key="hooks">
      <H eyebrow="Hooks">As primeiras frases que mais seguram</H>
      <div className="grid grid-cols-3 gap-5">
        {qual.hooks.padroes.slice(0, 3).map((p, i) => (
          <div key={p.tipo} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <p className="text-gradient text-4xl font-extrabold">#{i + 1}</p>
            <p className="mt-3 text-2xl font-bold">{p.tipo}</p>
            <p className="mt-3 text-lg italic text-white/75">&ldquo;{p.exemplo}&rdquo;</p>
            <p className="mt-3 text-base text-white/50">{p.efetividade}</p>
          </div>
        ))}
      </div>
    </div>,

    // 7. Top posts
    <div key="top">
      <H eyebrow="Destaques">Os posts com mais potencial de alcance</H>
      <div className="grid grid-cols-6 gap-4">
        {bubble.topIds.map((id) => {
          const p = a.posts.find((x) => x.id === id)!;
          const s = bubble.posts.find((x) => x.id === id)!;
          return (
            <div key={id}>
              <div className="relative">
                <Thumb post={p} className="aspect-[4/5] w-full rounded-2xl" />
                <span className="absolute left-2 top-2 rounded-full bg-sunset px-2.5 py-0.5 text-sm font-bold">{s.score}</span>
              </div>
              <p className="mt-2 text-base text-white/60">
                {FORMAT_LABEL[p.format]} · {pct(quant.posts[id].engagementRate, 1)}
              </p>
              {p.views != null && <p className="text-base text-white/45">{compact(p.views)} views</p>}
            </div>
          );
        })}
      </div>
    </div>,

    // 8. Furar a bolha
    <div key="bolha" className="flex h-full flex-col">
      <H eyebrow="Furar a bolha">Chance de chegar em gente nova</H>
      <div className="flex gap-12">
        <ScoreRing score={bubble.profileScore} size={220} label={scoreLabel(bubble.profileScore)} />
        <div className="flex-1">
          <p className="text-2xl leading-snug text-white/90">{qual.furarBolha.diagnostico}</p>
          <div className="mt-8 grid grid-cols-2 gap-6 text-lg">
            <div>
              <p className="mb-2 font-bold text-emerald-300">Funciona</p>
              {qual.furarBolha.oQueFunciona.slice(0, 3).map((x) => (
                <p key={x} className="mb-1.5 text-white/75">
                  ✓ {x}
                </p>
              ))}
            </div>
            <div>
              <p className="mb-2 font-bold text-rose-300">Evitar</p>
              {qual.furarBolha.oQueEvitar.slice(0, 3).map((x) => (
                <p key={x} className="mb-1.5 text-white/75">
                  ✕ {x}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,

    // 9. Ideias
    ...(qual.furarBolha.ideias.length
      ? [
          <div key="ideias">
            <H eyebrow="Ideias">O que testar agora</H>
            <div className="grid grid-cols-2 gap-5">
              {qual.furarBolha.ideias.slice(0, 4).map((i) => (
                <div key={i.titulo} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-2xl font-bold">{i.titulo}</p>
                    <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm">{i.formato}</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-pink-200">&ldquo;{i.hook}&rdquo;</p>
                  <p className="mt-2 text-base text-white/60">{i.porque}</p>
                </div>
              ))}
            </div>
          </div>,
        ]
      : []),

    // 10. Recomendações
    <div key="recs">
      <H eyebrow="Próximos passos">Recomendações</H>
      <div className="space-y-4">
        {qual.recomendacoes.slice(0, 5).map((r, i) => (
          <div key={r.titulo} className="flex gap-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sunset text-xl font-extrabold">{i + 1}</span>
            <div>
              <p className="text-2xl font-bold">{r.titulo}</p>
              <p className="text-lg text-white/60">{r.detalhe}</p>
            </div>
          </div>
        ))}
      </div>
    </div>,

    // 11. Metodologia
    <div key="metodo" className="flex h-full flex-col justify-center">
      <H eyebrow="Como foi feita">Metodologia</H>
      <div className="grid grid-cols-2 gap-8 text-xl text-white/75">
        <p>
          Dados públicos coletados pela API oficial da Meta (Business Discovery): seguidores, posts, curtidas, comentários e views dos Reels. Alcance,
          salvamentos, envios e tempo assistido não são públicos.
        </p>
        <p>
          A nota de furar a bolha usa os sinais que a Meta confirmou publicamente (tempo assistido, curtidas e envios por alcance, formato e diretrizes de
          recomendação), estimados a partir dos dados públicos.
        </p>
      </div>
    </div>,
  ];
}

export default function ApresentacaoPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const { data } = useAnalysis(handle);
  const [i, setI] = useState(0);
  const [scale, setScale] = useState(1);
  const wrap = useRef<HTMLDivElement>(null);

  const slides = data ? buildSlides(data) : [];
  const total = slides.length;

  useEffect(() => {
    const fit = () => {
      const w = wrap.current?.clientWidth ?? W;
      setScale(Math.min(1, w / W));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [data]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setI((x) => Math.min(x + 1, total - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [total]);

  if (!data) return <Loading handle={handle} />;

  return (
    <main className="mx-auto max-w-[1340px] px-4 pb-16 sm:px-6">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/perfil/${handle}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar pro dashboard
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setI((x) => Math.max(x - 1, 0))} className="rounded-full bg-white/[0.07] p-2 hover:bg-white/10" aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-14 text-center text-sm text-white/60">
            {i + 1}/{total}
          </span>
          <button onClick={() => setI((x) => Math.min(x + 1, total - 1))} className="rounded-full bg-white/[0.07] p-2 hover:bg-white/10" aria-label="Próximo">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => window.print()}
            className="ml-2 inline-flex items-center gap-2 rounded-full bg-sunset px-4 py-2 text-sm font-bold text-white hover:brightness-110"
          >
            <Download className="h-4 w-4" /> Baixar PDF
          </button>
        </div>
      </div>

      <div ref={wrap} className="w-full">
        {slides.map((s, idx) => (
          <div
            key={idx}
            className={idx === i ? "block" : "hidden print:block"}
            style={{ height: SH * scale }}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }} className="print:!transform-none">
              <Slide n={idx + 1} total={total} handle={data.handle}>
                {s}
              </Slide>
            </div>
          </div>
        ))}
      </div>
      <p className="no-print mt-4 text-center text-xs text-white/40">Use as setas do teclado pra passar os slides. No PDF, escolha &ldquo;Salvar como PDF&rdquo;.</p>
    </main>
  );
}
