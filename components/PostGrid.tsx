"use client";

import { Eye, Heart, MessageCircle, X, ExternalLink, PlayCircle, BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FORMAT_LABEL, compact, pct, shortDate, times } from "@/lib/format";
import type { Analysis, MediaFormat, Post } from "@/lib/types";
import { InstagramEmbed, Thumb, embedUrl } from "./Media";
import { Portal } from "./Portal";
import { Badge, Meter } from "./ui";

export { Thumb };

type Sort = "recentes" | "engajamento" | "bolha";

export function PostGrid({ analysis }: { analysis: Analysis }) {
  const [sort, setSort] = useState<Sort>("bolha");
  const [format, setFormat] = useState<MediaFormat | "ALL">("ALL");
  const [open, setOpen] = useState<Post | null>(null);

  const scoreById = useMemo(() => new Map(analysis.bubble.posts.map((b) => [b.id, b])), [analysis]);
  const formats = useMemo(() => [...new Set(analysis.posts.map((p) => p.format))], [analysis]);

  const posts = useMemo(() => {
    const list = analysis.posts.filter((p) => format === "ALL" || p.format === format);
    return [...list].sort((a, b) => {
      if (sort === "recentes") return b.timestamp.localeCompare(a.timestamp);
      if (sort === "engajamento") return analysis.quant.posts[b.id].engagementRate - analysis.quant.posts[a.id].engagementRate;
      return (scoreById.get(b.id)?.score ?? 0) - (scoreById.get(a.id)?.score ?? 0);
    });
  }, [analysis, sort, format, scoreById]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["bolha", "engajamento", "recentes"] as Sort[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${sort === s ? "bg-white text-ink" : "bg-white/[0.06] text-white/70 hover:bg-white/10"}`}
          >
            {s === "bolha" ? "Furar a bolha" : s === "engajamento" ? "Mais engajamento" : "Mais recentes"}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-white/10" />
        {(["ALL", ...formats] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${format === f ? "bg-sunset text-white" : "bg-white/[0.06] text-white/70 hover:bg-white/10"}`}
          >
            {f === "ALL" ? "Todos" : FORMAT_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {posts.map((p) => {
          const m = analysis.quant.posts[p.id];
          const score = scoreById.get(p.id)?.score ?? 0;
          return (
            <button
              key={p.id}
              onClick={() => setOpen(p)}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl text-left ring-1 ring-white/10 transition duration-200 hover:-translate-y-0.5 hover:ring-white/30 active:scale-[0.98]"
            >
              <Thumb post={p} className="h-full w-full" showPlay />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 pt-10">
                <div className="flex items-center justify-between text-[11px] font-semibold text-white">
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5">
                      <Heart className="h-3 w-3" />
                      {compact(p.likes)}
                    </span>
                    {p.views != null && (
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-3 w-3" />
                        {compact(p.views)}
                      </span>
                    )}
                  </span>
                  <span className="rounded-full bg-white/15 px-1.5 py-0.5 backdrop-blur">{pct(m.engagementRate, 1)}</span>
                </div>
              </div>
              <div
                className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${score >= 70 ? "bg-sunset text-white" : "bg-black/55 text-white/85 backdrop-blur"}`}
                title="Nota de potencial pra furar a bolha"
              >
                {score}
              </div>
            </button>
          );
        })}
      </div>

      {open && <PostDrawer analysis={analysis} post={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PostDrawer({ analysis, post, onClose }: { analysis: Analysis; post: Post; onClose: () => void }) {
  const m = analysis.quant.posts[post.id];
  const q = analysis.qual.posts.find((x) => x.id === post.id);
  const b = analysis.bubble.posts.find((x) => x.id === post.id);
  const canEmbed = Boolean(embedUrl(post.permalink));
  const [view, setView] = useState<"post" | "analise">(canEmbed ? "post" : "analise");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <Portal>
    <div className="animate-fade fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="animate-drawer h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-ink-2 p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge>{FORMAT_LABEL[post.format]}</Badge>
            <span className="text-xs text-white/50">{shortDate(post.timestamp)}</span>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {canEmbed && (
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-white/[0.06] p-1 text-sm font-semibold">
            {(
              [
                ["post", "Ver post", PlayCircle],
                ["analise", "Análise", BarChart3],
              ] as const
            ).map(([id, label, I]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center justify-center gap-1.5 rounded-full py-2 transition ${view === id ? "bg-white text-ink" : "text-white/65 hover:text-white"}`}
              >
                <I className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        )}

        {view === "post" && canEmbed ? (
          <div className="mb-4">
            <InstagramEmbed permalink={post.permalink} fallback={<Thumb post={post} className="aspect-[4/5] w-full" />} />
          </div>
        ) : (
          <Thumb post={post} className="mx-auto mb-4 aspect-[4/5] w-2/3 rounded-2xl" />
        )}

        <div className="mb-5 grid grid-cols-4 gap-2 text-center">
          {[
            { icon: Heart, v: compact(post.likes), l: "curtidas" },
            { icon: MessageCircle, v: compact(post.comments), l: "coment." },
            { icon: Eye, v: compact(post.views), l: "views" },
            { icon: null, v: pct(m.engagementRate, 1), l: "engaj." },
          ].map(({ icon: I, v, l }) => (
            <div key={l} className="rounded-2xl bg-white/[0.05] p-2">
              <p className="flex items-center justify-center gap-1 text-sm font-bold">
                {I && <I className="h-3.5 w-3.5 text-white/60" />}
                {v}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-white/45">{l}</p>
            </div>
          ))}
        </div>

        {post.insights && (
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { v: compact(post.insights.reach), l: "alcance" },
              { v: compact(post.insights.shares), l: "envios" },
              { v: compact(post.insights.saved), l: "salvos" },
              { v: post.insights.avgWatchTimeSec != null ? `${post.insights.avgWatchTimeSec.toLocaleString("pt-BR")}s` : "—", l: "assistido" },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl bg-gradient-to-br from-pink-500/15 to-purple-500/10 p-2 text-center ring-1 ring-pink-400/20">
                <p className="text-sm font-bold">{x.v}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/50">{x.l}</p>
              </div>
            ))}
          </div>
        )}

        {b && (
          <div className="mb-5 rounded-2xl bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Potencial de furar a bolha</p>
              <span className="text-gradient text-2xl font-extrabold">{b.score}</span>
            </div>
            <div className="space-y-3">
              {b.signals.map((s) => (
                <div key={s.key}>
                  <Meter value={Math.round(s.value * 100) / 10} label={`${s.label} · peso ${s.weight}`} />
                  <p className="mt-1 text-[11px] text-white/45">{s.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {q && (
          <div className="mb-5 space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Hook</p>
              <p className="mt-1 font-semibold">&ldquo;{q.hook || "Sem legenda"}&rdquo;</p>
              <p className="mt-1 text-xs text-white/55">
                {q.tipoHook} · tema: {q.tema}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Leitura</p>
              <p className="mt-1 text-white/80">{q.leitura}</p>
            </div>
            {q.riscoRecomendacao && (
              <div className="rounded-xl bg-amber-400/10 p-3 text-amber-200">
                <p className="text-xs font-bold">Risco de não ser recomendado</p>
                <p className="mt-0.5 text-xs">{q.riscoRecomendacao}</p>
              </div>
            )}
            <p className="text-xs text-white/50">
              {times(m.relativeToMedian)} a mediana do perfil
              {m.viewsPerFollower != null && ` · views = ${times(m.viewsPerFollower)} os seguidores`}
            </p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Legenda</p>
          <p className="mt-1 whitespace-pre-line text-sm text-white/75">{post.caption || "Sem legenda."}</p>
        </div>

        <a
          href={post.permalink}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white"
        >
          Abrir no Instagram <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </aside>
    </div>
    </Portal>
  );
}
