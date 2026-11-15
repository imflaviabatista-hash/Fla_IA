"use client";

import { AlertTriangle, ArrowUpRight, ChevronDown, Lightbulb, Presentation, RefreshCw, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FORMAT_LABEL, compact, pct, scoreLabel, times } from "@/lib/format";
import type { Analysis } from "@/lib/types";
import { EngagementTimeline, FormatBars, WeekdayBars } from "./charts";
import { Checklist, Chips, HookRanking, InsightCards, NicheRadar, ThemeMatrix } from "./Insights";
import { proxied } from "./Media";
import { OptinCta, PrivatePanel } from "./PrivatePanel";
import { PostGrid, Thumb } from "./PostGrid";
import { Avatar, Badge, Card, Meter, ScoreRing, SectionTitle, Stat } from "./ui";

const TABS = [
  { id: "geral", label: "Visão geral" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "nicho", label: "Nicho e posicionamento" },
  { id: "hooks", label: "Hooks e narrativas" },
  { id: "bolha", label: "Furar a bolha" },
] as const;
type Tab = (typeof TABS)[number]["id"];


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
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/50">
              <Zap className="h-3.5 w-3.5 text-amber-300" /> Raio-X em 5 segundos
            </p>
            <InsightCards items={qual.destaques ?? []} />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Engajamento típico" value={pct(quant.medianEngagement)} hint={`média ${pct(quant.avgEngagement)}`} />
            <Stat label="Curtidas por post" value={compact(quant.avgLikes)} hint={`${compact(quant.avgComments)} comentários`} />
            <Stat label="Views médias dos Reels" value={compact(quant.avgReelViews)} />
            <Stat label="Views vs. seguidores" value={times(quant.reelsReachRatio)} hint="acima de 1x = chegou em gente nova" />
            <Stat label="Furar a bolha" value={`${bubble.profileScore}`} hint={`potencial ${scoreLabel(bubble.profileScore).toLowerCase()}`} accent />
          </div>

          {analysis.privado ? <PrivatePanel data={analysis.privado} /> : <OptinCta />}

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
              <SectionTitle eyebrow="Próximos passos" title="O que fazer agora" />
              <Checklist items={qual.recomendacoes} />
            </Card>
            <Card>
              <SectionTitle title="Melhores dias pra postar">Horário de Brasília</SectionTitle>
              <WeekdayBars quant={quant} />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { v: `${quant.postsPerWeek.toLocaleString("pt-BR")}`, l: "posts/semana" },
                  { v: pct(quant.ctaShare, 0), l: "com chamada pra ação" },
                  { v: `${qual.qualidade.nota.toLocaleString("pt-BR")}/10`, l: "qualidade" },
                ].map((x) => (
                  <div key={x.l} className="rounded-2xl bg-white/[0.05] p-2.5">
                    <p className="text-lg font-extrabold">{x.v}</p>
                    <p className="text-[11px] text-white/50">{x.l}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <details className="card group p-5 sm:p-6">
            <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
              Ler a análise completa
              <ChevronDown className="h-4 w-4 text-white/50 transition group-open:rotate-180" />
            </summary>
            <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-white/75">
              <p>{qual.resumo}</p>
              <p>{qual.qualidade.comentario}</p>
              <p>{qual.furarBolha.diagnostico}</p>
            </div>
          </details>
        </div>
      )}

      {tab === "conteudo" && <PostGrid analysis={analysis} />}

      {tab === "nicho" && (
        <div className="space-y-6">
          <Card>
            <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Nicho</p>
                <h2 className="mt-1 text-2xl font-extrabold leading-tight">{qual.nicho.principal}</h2>
                <div className="mt-3">
                  <Chips items={qual.nicho.subnichos} />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-white/50">Proposta</p>
                <p className="mt-1 font-semibold text-white/90">{qual.posicionamento.proposta}</p>
              </div>
              <div className="space-y-4">
                <Meter value={qual.nicho.clareza} label="Clareza do nicho" />
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/50">Fala com</p>
                  <p className="text-sm text-white/85">{qual.posicionamento.publico}</p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/50">Tom de voz</p>
                  <Chips items={qual.posicionamento.tom.split(/,| e /).map((t) => t.trim()).filter(Boolean)} />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle title="Mapa de temas">Cada bolinha é um tema. Quanto mais pra direita, mais aparece. Quanto mais pra cima, mais engaja.</SectionTitle>
            <ThemeMatrix analysis={analysis} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle title="Diferenciais" />
              <Chips items={qual.posicionamento.diferenciais} tone="good" />
            </Card>
            <Card>
              <SectionTitle title="Pontos de atenção" />
              <Chips items={qual.posicionamento.pontosFracos} tone="bad" />
            </Card>
          </div>
        </div>
      )}

      {tab === "hooks" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <SectionTitle eyebrow="Hooks" title="Qual gancho rende mais" />
            <HookRanking analysis={analysis} />
          </Card>
          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-4">
                <ScoreRing score={Math.round(qual.hooks.nota * 10)} size={110} />
                <div>
                  <p className="font-bold">Força dos hooks</p>
                  <p className="mt-1 text-sm text-white/55">O quanto as primeiras frases seguram a pessoa.</p>
                </div>
              </div>
            </Card>
            <Card>
              <SectionTitle title="Como melhorar" />
              <Chips items={qual.hooks.sugestoes} />
            </Card>
          </div>
          {qual.narrativas.length > 0 && (
            <Card className="lg:col-span-3">
              <SectionTitle eyebrow="Narrativas" title="As histórias que o perfil conta" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {qual.narrativas.map((n) => (
                  <div key={n.nome} className="rounded-2xl bg-white/[0.04] p-4">
                    <p className="font-bold">{n.nome}</p>
                    <p className="mt-1 text-sm text-white/60">{n.descricao}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "bolha" && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <ScoreRing score={bubble.profileScore} size={150} label={scoreLabel(bubble.profileScore)} />
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Potencial de furar a bolha</p>
                  {analysis.privado?.nonFollowerShare != null && (
                    <p className="mt-2 inline-flex rounded-full bg-sunset px-3 py-1 text-sm font-bold">
                      {pct(analysis.privado.nonFollowerShare, 0)} do alcance veio de quem não segue
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-bold text-emerald-300">Funciona</p>
                    <Chips items={qual.furarBolha.oQueFunciona} tone="good" />
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-bold text-rose-300">Evitar</p>
                    <Chips items={qual.furarBolha.oQueEvitar} tone="bad" />
                  </div>
                </div>
                <Link href="/algoritmo" className="inline-flex items-center text-xs font-semibold text-white/50 hover:text-white">
                  Como a nota é calculada <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </Card>

          <Card>
            <NicheRadar analysis={analysis} />
          </Card>

          <Card>
            <SectionTitle title="Posts desse perfil com mais potencial" />
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
              <SectionTitle eyebrow="Ideias" title="Pra testar e chegar em gente nova" />
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
                    <p className="text-[15px] font-semibold text-pink-100">&ldquo;{i.hook}&rdquo;</p>
                    <p className="mt-1 text-sm text-white/55">{i.porque}</p>
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
