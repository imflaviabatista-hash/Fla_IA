"use client";

import { ExternalLink, Eye, Flame, Hash, Heart, MessageCircle, Plus, RefreshCw, ScanSearch, Search, Settings2, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InstagramEmbed, Thumb } from "@/components/Media";
import { Portal } from "@/components/Portal";
import { Badge, Card } from "@/components/ui";
import { FORMAT_LABEL, compact, shortDate } from "@/lib/format";
import type { TrendCategory, TrendItem, TrendResult } from "@/lib/trends";

export default function RadarPage() {
  const [cats, setCats] = useState<TrendCategory[]>([]);
  const [active, setActive] = useState<string>("");
  const [regiao, setRegiao] = useState<"br" | "mundo">("br");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<TrendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState<TrendItem | null>(null);

  const loadCats = useCallback(async () => {
    const list = (await fetch("/api/trends/categories").then((r) => r.json())) as TrendCategory[];
    setCats(list);
    return list;
  }, []);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("c");
    loadCats().then((list) => setActive((a) => a || (fromUrl && list.some((c) => c.id === fromUrl) ? fromUrl : list[0]?.id) || ""));
  }, [loadCats]);

  const load = useCallback(async (id: string, refresh = false, reg: "br" | "mundo" = "br") => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trends?categoria=${id}&regiao=${reg}${refresh ? "&refresh=1" : ""}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar trends.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(active, false, regiao);
  }, [active, regiao, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cats;
    return cats.filter((c) => c.nome.toLowerCase().includes(q) || c.hashtags.some((h) => h.includes(q.replace(/^#/, ""))));
  }, [cats, query]);

  const createFromQuery = async () => {
    const nome = query.trim().replace(/^#/, "");
    if (!nome) return;
    const res = await fetch("/api/trends/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nome: nome.charAt(0).toUpperCase() + nome.slice(1) }),
    });
    const cat = (await res.json()) as TrendCategory;
    await loadCats();
    setQuery("");
    setActive(cat.id);
  };

  const current = cats.find((c) => c.id === active);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <section className="pb-8 pt-6 sm:pt-10">
        <Badge>
          <Flame className="h-3 w-3" /> Radar de trends
        </Badge>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
          O que <span className="text-gradient">furou a bolha</span> essa semana
        </h1>
        <p className="mt-3 max-w-2xl text-white/65">Os 20 conteúdos que mais chegaram em gente de fora em cada categoria, nos últimos 30 dias.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Categorias */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="card p-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.05] px-3 py-2">
              <Search className="h-4 w-4 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !filtered.length && createFromQuery()}
                placeholder="Pesquisar categoria"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/35"
              />
            </div>
            <div className="scrollbar-none mt-2 flex gap-1 overflow-x-auto lg:block lg:space-y-0.5">
              {filtered.map((c, idx) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition lg:w-full ${active === c.id ? "bg-white text-ink" : "text-white/75 hover:bg-white/5"}`}
                >
                  <span className={`hidden w-5 text-xs font-bold lg:inline ${active === c.id ? "text-ink/50" : "text-white/35"}`}>{idx + 1}</span>
                  <span className="flex-1 font-semibold">{c.nome}</span>
                  <span className={`hidden text-[11px] lg:inline ${active === c.id ? "text-ink/50" : "text-white/35"}`}>#{c.hashtags[0] ?? c.id}</span>
                </button>
              ))}
              {query.trim() && !cats.some((c) => c.nome.toLowerCase() === query.trim().toLowerCase()) && (
                <button
                  onClick={createFromQuery}
                  className="flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold text-pink-300 hover:bg-white/5 lg:w-full"
                >
                  <Plus className="h-4 w-4" /> Criar &ldquo;{query.trim()}&rdquo;
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Ranking */}
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-extrabold">{current?.nome ?? "Categoria"}</h2>
                <div className="flex rounded-full bg-white/[0.06] p-1 text-xs font-semibold" role="group" aria-label="Região">
                  {(
                    [
                      ["br", "🇧🇷 Brasil"],
                      ["mundo", "🌎 Mundo"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setRegiao(id)}
                      className={`rounded-full px-3 py-1.5 transition active:scale-95 ${regiao === id ? "bg-white text-ink" : "text-white/65 hover:text-white"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {data && (
                <p className="text-xs text-white/45">
                  Atualizado {new Date(data.updatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  {data.source === "demo" && " · demonstração"}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                <Settings2 className="h-3.5 w-3.5" /> Fontes
              </button>
              <button
                onClick={() => load(active, true, regiao)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
              </button>
            </div>
          </div>

          {data?.avisos.map((a) => (
            <p key={a} className="mb-3 rounded-2xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              {a}
            </p>
          ))}
          {error && <p className="mb-3 rounded-2xl bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p>}

          {data && data.items.length > 0 && (
            <Card className="mb-4 !p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">O que esses conteúdos têm em comum</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {data.padroes.furoMedio != null && <Badge tone="brand">Views {data.padroes.furoMedio.toLocaleString("pt-BR")}x os seguidores, em média</Badge>}
                {data.padroes.formatos.map((f) => (
                  <Badge key={f.format}>
                    {f.share}% {FORMAT_LABEL[f.format]}
                  </Badge>
                ))}
                {data.padroes.hooks.slice(0, 3).map((h) => (
                  <Badge key={h.tipo}>
                    Hook: {h.tipo} ({h.count})
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          <ol className={`space-y-2 transition ${loading ? "opacity-50" : ""}`}>
            {!data &&
              Array.from({ length: 8 }, (_, i) => (
                <li key={i} className="card flex items-center gap-4 p-3">
                  <span className="h-5 w-7 animate-pulse rounded bg-white/10" />
                  <span className="h-20 w-16 animate-pulse rounded-xl bg-white/10" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-3/4 animate-pulse rounded bg-white/10" />
                    <span className="block h-3 w-1/2 animate-pulse rounded bg-white/10" />
                  </span>
                </li>
              ))}
            {data?.items.map((it, idx) => (
              <li key={it.id}>
                <button
                  onClick={() => setOpen(it)}
                  className="card group flex w-full items-center gap-3 p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.07] active:scale-[0.99] sm:gap-4"
                >
                  <span className={`w-7 shrink-0 text-center text-lg font-extrabold ${idx < 3 ? "text-gradient" : "text-white/35"}`}>{idx + 1}</span>
                  <Thumb post={{ ...it, caption: it.hook }} className="h-20 w-16 shrink-0 rounded-xl" showPlay small />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{it.hook || "Sem legenda"}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-white/50">
                      {it.autor ? <span className="font-semibold text-white/70">@{it.autor}</span> : <span>autor não informado pela Meta</span>}
                      {it.seguidores != null && <span>{compact(it.seguidores)} seguidores</span>}
                      <span>{FORMAT_LABEL[it.format]}</span>
                      <span>{shortDate(it.timestamp)}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-white/40">Hook: {it.tipoHook}</p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    {it.furo != null ? (
                      <>
                        <p className="flex items-center justify-end gap-1 text-xl font-extrabold">
                          <TrendingUp className="h-4 w-4 text-pink-400" />
                          {it.furo.toLocaleString("pt-BR")}x
                        </p>
                        <p className="text-[11px] text-white/45">views vs. seguidores</p>
                      </>
                    ) : (
                      <p className="flex items-center gap-1 text-xs font-semibold text-white/60">
                        <Hash className="h-3.5 w-3.5" />
                        {it.hashtag}
                      </p>
                    )}
                    <p className="mt-1 flex items-center justify-end gap-2 text-[11px] text-white/45">
                      {it.views != null && (
                        <span className="flex items-center gap-0.5">
                          <Eye className="h-3 w-3" />
                          {compact(it.views)}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-3 w-3" />
                        {compact(it.likes)}
                      </span>
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ol>
          {data && !data.items.length && !loading && (
            <p className="card p-6 text-center text-sm text-white/55">Nenhum conteúdo encontrado nessa categoria nos últimos 30 dias.</p>
          )}
        </section>
      </div>

      {open && <TrendModal item={open} onClose={() => setOpen(null)} />}

      {editing && current && (
        <SourcesModal
          cat={current}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await loadCats();
            load(current.id, true, regiao);
          }}
        />
      )}
    </main>
  );
}

function SourcesModal({ cat, onClose, onSaved }: { cat: TrendCategory; onClose: () => void; onSaved: () => void }) {
  const [hashtags, setHashtags] = useState(cat.hashtags.join(", "));
  const [perfis, setPerfis] = useState(cat.perfis.join(", "));
  const [saving, setSaving] = useState(false);
  const split = (s: string) => s.split(/[,\s]+/).filter(Boolean);

  return (
    <Portal>
    <div className="animate-fade fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-pop w-full max-w-lg rounded-3xl border border-white/10 bg-ink-2 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Fontes de {cat.nome}</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block text-sm font-semibold">Hashtags</label>
        <p className="mb-1.5 text-xs text-white/50">A Meta traz os posts mais populares de cada uma. Limite de 30 hashtags diferentes por semana.</p>
        <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} className="w-full rounded-2xl bg-white/[0.06] px-3 py-2.5 text-sm outline-none" />
        <label className="mt-4 block text-sm font-semibold">Perfis de referência</label>
        <p className="mb-1.5 text-xs text-white/50">Contas comerciais ou de criador do nicho. É daqui que sai a medida real de quem furou a bolha.</p>
        <textarea
          value={perfis}
          onChange={(e) => setPerfis(e.target.value)}
          rows={3}
          placeholder="@perfil1, @perfil2"
          className="w-full rounded-2xl bg-white/[0.06] px-3 py-2.5 text-sm outline-none placeholder:text-white/30"
        />
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await fetch("/api/trends/categories", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ nome: cat.nome, hashtags: split(hashtags), perfis: split(perfis) }),
            });
            onSaved();
          }}
          className="mt-5 w-full rounded-full bg-sunset py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar e atualizar"}
        </button>
      </div>
    </div>
    </Portal>
  );
}

function TrendModal({ item, onClose }: { item: TrendItem; onClose: () => void }) {
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
      <aside className="animate-drawer h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-ink-2 p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge>{FORMAT_LABEL[item.format]}</Badge>
            <span className="text-xs text-white/50">{shortDate(item.timestamp)}</span>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-white/10" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <InstagramEmbed permalink={item.permalink} fallback={<Thumb post={{ ...item, caption: item.hook }} className="aspect-[4/5] w-full rounded-2xl" />} />

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { I: Eye, v: compact(item.views), l: "views" },
            { I: Heart, v: compact(item.likes), l: "curtidas" },
            { I: MessageCircle, v: compact(item.comments), l: "coment." },
          ].map(({ I, v, l }) => (
            <div key={l} className="rounded-2xl bg-white/[0.05] p-2">
              <p className="flex items-center justify-center gap-1 text-sm font-bold">
                <I className="h-3.5 w-3.5 text-white/60" />
                {v}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-white/45">{l}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-white/[0.04] p-4">
          <p className="text-gradient text-lg font-extrabold">{item.metrica}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-white/45">Hook · {item.tipoHook}</p>
          <p className="mt-1 text-sm font-semibold">&ldquo;{item.hook || "Sem legenda"}&rdquo;</p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {item.autor && !item.autor.startsWith("criador.demo") && (
            <Link
              href={`/perfil/${item.autor}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sunset py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              <ScanSearch className="h-4 w-4" /> Analisar @{item.autor}
            </Link>
          )}
          <a
            href={item.permalink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.07] py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
          >
            Abrir no Instagram <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </aside>
    </div>
    </Portal>
  );
}
