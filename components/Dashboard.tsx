"use client";

import { AlertTriangle, ArrowUpRight, Lightbulb, Presentation, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FORMAT_LABEL, compact, pct, scoreLabel, times } from "@/lib/format";
import type { Analysis } from "@/lib/types";
import { EngagementTimeline, FormatBars, WeekdayBars } from "./charts";
import { proxied } from "./Media";
import { OptinCta, PrivatePanel } from "./PrivatePanel";
import { PostGrid, Thumb } from "./PostGrid";
import { Avatar, Badge, Card, List, Meter, ScoreRing, SectionTitle, Stat } from "./ui";

const TABS = [
  { id: "geral", label: "Visão geral" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "nicho", label: "Nicho e posicionamento" },
  { id: "hooks", label: "Hooks e narrativas" },
  { id: "bolha", label: "Furar a bolha" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const PRIORITY_TONE = { alta: "bad", média: "warn", baixa: "default" } as const;
const PERF_TONE = { acima: "good", "na média": "default", abaixo: "bad" } as const;

export function Dashboard({ analysis, onRefresh, refreshing }: { analysis: Analysis; onRefresh: () => void; refreshing: boolean }) {
  const [tab, setTab] = useState<Tab>("geral");
  const { profile, quant, qual, bubble } = analysis;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      {/* Cabeçalho do perfil */}
      <Card className="mb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar src={proxied(`avatar_${profile.username}`, profile.avatar)} name={profile.name} size={76} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">@{profile.username}</h1>
              {analysis.source === "demo" && <Badge tone="warn">Demonstração</Badge>}
              {analysis.source === "instagram" && <Badge tone="good">Dados públicos da Meta</Badge>}
              {(analysis.source === "optin" || analysis.privado) && <Badge tone="good">Análise completa (opt-in)</Badge>}
              {qual.engine === "claude" ? (
                <Badge tone="brand">
                  <Sparkles className="h-3 w-3" /> Análise com IA
                </Badge>
              ) : (
                <Badge>Análise básica</Badge>
              )}
            </div>
            <p className="text-sm font-medium text-white/70">{profile.name}</p>
            <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-white/55">{profile.bio}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span>
                <b>{compact(profile.followers)}</b> <span className="text-white/55">seguidores</span>
              </span>
              <span>
                <b>{compact(profile.mediaCount)}</b> <span className="text-white/55">posts</span>
              </span>
              <span>
                <b>{quant.postsPerWeek.toLocaleString("pt-BR")}</b> <span className="text-white/55">posts/semana</span>
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <Link
              href={`/perfil/${analysis.handle}/apresentacao`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sunset px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:brightness-110"
            >
              <Presentation className="h-4 w-4" /> Apresentação
            </Link>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.07] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
            </button>
          </div>
        </div>
        {analysis.warnings.length > 0 && (
          <div className="mt-4 space-y-1 rounded-2xl bg-amber-400/10 p-3 text-xs text-amber-200">
            {analysis.warnings.map((w) => (
              <p key={w} className="flex gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {w}
              </p>
            ))}
          </div>
        )}
      </Card>

      {/* Abas */}
      <div className="scrollbar-none sticky top-0 z-20 -mx-4 mb-6 flex gap-1 overflow-x-auto bg-ink/80 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:px-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition duration-200 active:scale-95 ${tab === t.id ? "bg-white text-ink" : "text-white/65 hover:bg-white/5 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-page">
      {tab === "geral" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Engajamento médio" value={pct(quant.avgEngagement)} hint={`mediana ${pct(quant.medianEngagement)}`} />
            <Stat label="Curtidas por post" value={compact(quant.avgLikes)} hint={`${compact(quant.avgComments)} comentários`} />
            <Stat label="Views médias dos Reels" value={compact(quant.avgReelViews)} />
            <Stat label="Views vs. seguidores" value={times(quant.reelsReachRatio)} hint="acima de 1x = chegou em gente de fora" />
            <Stat label="Furar a bolha" value={`${bubble.profileScore}`} hint={`potencial ${scoreLabel(bubble.profileScore).toLowerCase()}`} accent />
          </div>

          {analysis.privado ? <PrivatePanel data={analysis.privado} /> : <OptinCta />}

          <Card>
            <SectionTitle eyebrow="Resumo" title="O que a gente viu nesse perfil" />
            <p className="text-[15px] leading-relaxed text-white/80">{qual.resumo}</p>
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <SectionTitle title="Engajamento por post">
                {quant.postsAnalyzed} posts nos últimos {quant.periodDays} dias
              </SectionTitle>
              <EngagementTimeline quant={quant} />
            </Card>
            <Card className="lg:col-span-2">
              <SectionTitle title="Engajamento por formato" />
              <FormatBars quant={quant} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle title="Melhores dias pra postar">Horário de Brasília</SectionTitle>
              <WeekdayBars quant={quant} />
            </Card>
            <Card>
              <SectionTitle title="Hábitos de legenda" />
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white/[0.05] p-3">
                  <p className="text-xl font-extrabold">{quant.avgCaptionLength}</p>
                  <p className="text-[11px] text-white/50">caracteres em média</p>
                </div>
                <div className="rounded-2xl bg-white/[0.05] p-3">
                  <p className="text-xl font-extrabold">{quant.avgHashtags}</p>
                  <p className="text-[11px] text-white/50">hashtags por post</p>
                </div>
                <div className="rounded-2xl bg-white/[0.05] p-3">
                  <p className="text-xl font-extrabold">{pct(quant.ctaShare, 0)}</p>
                  <p className="text-[11px] text-white/50">com chamada pra ação</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <Meter value={qual.qualidade.nota} label="Qualidade geral do conteúdo" />
                <p className="text-sm text-white/65">{qual.qualidade.comentario}</p>
              </div>
            </Card>
          </div>

          <Card>
            <SectionTitle eyebrow="Próximos passos" title="Recomendações" />
            <div className="grid gap-3 md:grid-cols-2">
              {qual.recomendacoes.map((r) => (
                <div key={r.titulo} className="rounded-2xl bg-white/[0.04] p-4">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <p className="font-bold">{r.titulo}</p>
                    <Badge tone={PRIORITY_TONE[r.prioridade]}>{r.prioridade}</Badge>
                  </div>
                  <p className="text-sm text-white/65">{r.detalhe}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "conteudo" && <PostGrid analysis={analysis} />}

      {tab === "nicho" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle eyebrow="Nicho" title={qual.nicho.principal} />
            <div className="mb-4 flex flex-wrap gap-2">
              {qual.nicho.subnichos.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
            <Meter value={qual.nicho.clareza} label="Clareza do nicho" />
            <p className="mt-3 text-sm text-white/65">{qual.nicho.comentario}</p>
          </Card>
          <Card>
            <SectionTitle eyebrow="Posicionamento" title="Como o perfil se apresenta" />
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-white/45">Proposta</dt>
                <dd className="mt-0.5 text-white/85">{qual.posicionamento.proposta}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-white/45">Público</dt>
                <dd className="mt-0.5 text-white/85">{qual.posicionamento.publico}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-white/45">Tom de voz</dt>
                <dd className="mt-0.5 text-white/85">{qual.posicionamento.tom}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <SectionTitle title="Diferenciais" />
            <List items={qual.posicionamento.diferenciais} icon="✦" />
          </Card>
          <Card>
            <SectionTitle title="Pontos de atenção" />
            <List items={qual.posicionamento.pontosFracos} icon="!" />
          </Card>
          <Card className="lg:col-span-2">
            <SectionTitle title="Temas mais falados">Quanto cada tema aparece e como ele performa</SectionTitle>
            <div className="space-y-4">
              {qual.temas.map((t) => (
                <div key={t.nome}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <p className="font-semibold">{t.nome}</p>
                    <div className="flex items-center gap-2">
                      <Badge tone={PERF_TONE[t.desempenho]}>{t.desempenho === "na média" ? "na média" : `${t.desempenho} da média`}</Badge>
                      <span className="w-10 text-right text-sm font-bold">{t.percentual}%</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className="h-full rounded-full bg-sunset" style={{ width: `${Math.min(100, t.percentual)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-white/50">{t.comentario}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "hooks" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <SectionTitle eyebrow="Hooks" title="Nota dos ganchos" />
            <div className="flex justify-center py-2">
              <ScoreRing score={Math.round(qual.hooks.nota * 10)} label="de 100" />
            </div>
            <p className="mt-3 text-center text-sm text-white/55">Força média das primeiras frases, que seguram (ou não) as pessoas no começo.</p>
          </Card>
          <Card className="lg:col-span-2">
            <SectionTitle title="Padrões de hook">Do que mais rende pro que menos rende</SectionTitle>
            <div className="space-y-3">
              {qual.hooks.padroes.map((p) => (
                <div key={p.tipo} className="rounded-2xl bg-white/[0.04] p-4">
                  <p className="font-bold">{p.tipo}</p>
                  <p className="mt-1 text-sm italic text-white/75">&ldquo;{p.exemplo}&rdquo;</p>
                  <p className="mt-1 text-xs text-white/50">{p.efetividade}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-3">
            <SectionTitle title="Como melhorar os hooks" />
            <List items={qual.hooks.sugestoes} icon="→" />
          </Card>
          <Card className="lg:col-span-3">
            <SectionTitle eyebrow="Narrativas" title="As histórias que o perfil conta" />
            {qual.narrativas.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {qual.narrativas.map((n) => (
                  <div key={n.nome} className="rounded-2xl bg-white/[0.04] p-4">
                    <p className="font-bold">{n.nome}</p>
                    <p className="mt-1 text-sm text-white/65">{n.descricao}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/50">A leitura de narrativas precisa da análise com IA.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "bolha" && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <ScoreRing score={bubble.profileScore} size={170} label={scoreLabel(bubble.profileScore)} />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Potencial de furar a bolha</p>
                <p className="mt-2 text-[15px] leading-relaxed text-white/85">{qual.furarBolha.diagnostico}</p>
                {analysis.privado?.nonFollowerShare != null && (
                  <p className="mt-3 inline-flex rounded-full bg-sunset px-3 py-1 text-sm font-bold">
                    {pct(analysis.privado.nonFollowerShare, 0)} do alcance dos últimos 28 dias veio de quem não segue
                  </p>
                )}
                <p className="mt-3 text-xs text-white/45">
                  A nota junta views vs. seguidores, desempenho vs. média, potencial de envio por DM, força do hook e formato. Os pesos seguem o que a
                  Meta já disse publicamente.{" "}
                  <Link href="/algoritmo" className="inline-flex items-center font-semibold text-white/70 underline-offset-2 hover:underline">
                    Ver as fontes <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle title="O que tá funcionando" />
              <List items={qual.furarBolha.oQueFunciona} icon="✓" />
            </Card>
            <Card>
              <SectionTitle title="O que evitar" />
              <List items={qual.furarBolha.oQueEvitar} icon="✕" />
            </Card>
          </div>

          <Card>
            <SectionTitle title="Posts com mais potencial">Os que têm mais cara de chegar em gente nova</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {bubble.topIds.map((id) => {
                const p = analysis.posts.find((x) => x.id === id)!;
                const s = bubble.posts.find((x) => x.id === id)!;
                return (
                  <a key={id} href={p.permalink} target="_blank" rel="noreferrer" className="group">
                    <div className="relative">
                      <Thumb post={p} className="aspect-[4/5] w-full rounded-2xl ring-1 ring-white/10" />
                      <span className="absolute left-2 top-2 rounded-full bg-sunset px-2 py-0.5 text-[11px] font-bold">{s.score}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-white/55">
                      {FORMAT_LABEL[p.format]} · {pct(quant.posts[id].engagementRate, 1)}
                    </p>
                  </a>
                );
              })}
            </div>
          </Card>

          {qual.furarBolha.ideias.length > 0 && (
            <Card>
              <SectionTitle eyebrow="Ideias" title="Conteúdos pra testar e chegar em gente nova" />
              <div className="grid gap-3 md:grid-cols-2">
                {qual.furarBolha.ideias.map((i) => (
                  <div key={i.titulo} className="rounded-2xl bg-white/[0.04] p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="flex items-center gap-2 font-bold">
                        <Lightbulb className="h-4 w-4 shrink-0 text-amber-300" />
                        {i.titulo}
                      </p>
                      <Badge>{i.formato}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-white/90">&ldquo;{i.hook}&rdquo;</p>
                    <p className="mt-1 text-sm text-white/60">{i.porque}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
