"use client";

import { ArrowRight, AtSign, CheckCircle2, CircleDashed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readIndex } from "@/components/localCache";
import { proxied } from "@/components/Media";
import { Avatar, Badge } from "@/components/ui";
import { compact } from "@/lib/format";

interface Item {
  handle: string;
  name: string;
  avatar: string | null;
  followers: number;
  bubble: number;
  source: "instagram" | "optin" | "demo";
  createdAt: string;
}

function clean(input: string) {
  const m = input.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  return (m ? m[1] : input).trim().replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();
}

export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<{ instagram: boolean; ai: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/analyses")
      .then((r) => r.json())
      .then((j: { items: Item[]; status: { instagram: boolean; ai: boolean } }) => {
        const local = readIndex();
        const merged = [...local, ...j.items.filter((i) => !local.some((l) => l.handle === i.handle))];
        setItems(merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setStatus(j.status);
      })
      .catch(() => {});
  }, []);

  const go = (h: string) => {
    const handle = clean(h);
    if (handle) router.push(`/perfil/${handle}`);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <section className="mx-auto max-w-3xl pt-10 text-center sm:pt-20">
        <Badge>Dados oficiais da Meta + análise com IA</Badge>
        <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Cola o @. A gente te mostra <span className="text-gradient">o que tá funcionando.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-white/65 sm:text-lg">
          Nicho, posicionamento, hooks, formatos e o que tem mais chance de chegar em gente nova. Tudo num lugar só, pronto pra virar apresentação.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(value);
          }}
          className="mx-auto mt-9 max-w-xl rounded-full bg-sunset p-[2px] shadow-2xl shadow-pink-500/20"
        >
          <div className="flex items-center gap-2 rounded-full bg-ink-2 p-1.5 pl-5">
            <AtSign className="h-5 w-5 shrink-0 text-white/40" />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="perfil ou link do Instagram"
              className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-white/35"
              autoFocus
            />
            <button className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sunset px-5 py-3 text-sm font-bold text-white transition hover:brightness-110">
              Analisar <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        <button onClick={() => go("demo")} className="mt-4 text-sm font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline">
          Ainda sem token? Testa com o perfil @demo
        </button>

        {status && (
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs">
            {[
              { ok: status.instagram, on: "API da Meta conectada", off: "API da Meta não configurada" },
              { ok: status.ai, on: "IA conectada", off: "IA não configurada (análise básica)" },
            ].map((s) => (
              <span
                key={s.on}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${s.ok ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[0.05] text-white/50"}`}
              >
                {s.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
                {s.ok ? s.on : s.off}
              </span>
            ))}
          </div>
        )}
      </section>

      {items.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/50">Perfis analisados</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <Link key={it.handle} href={`/perfil/${it.handle}`} className="card flex items-center gap-4 p-4 transition hover:bg-white/[0.07]">
                <Avatar src={proxied(`avatar_${it.handle}`, it.avatar)} name={it.name} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">@{it.handle}</p>
                  <p className="text-xs text-white/50">
                    {compact(it.followers)} seguidores · {new Date(it.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gradient text-xl font-extrabold">{it.bubble}</p>
                  <p className="text-[10px] uppercase tracking-wide text-white/45">bolha</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-20 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Quantitativo", d: "Engajamento, views dos Reels, formatos, dias e frequência. Com dados que a própria Meta entrega." },
          { t: "Qualitativo", d: "Nicho, posicionamento, temas, narrativas, hooks e qualidade, lidos pela IA post a post." },
          { t: "Furar a bolha", d: "Uma nota pra cada post baseada no que a Meta já disse sobre como o algoritmo recomenda." },
        ].map((f) => (
          <div key={f.t} className="card p-5">
            <p className="font-bold">{f.t}</p>
            <p className="mt-1 text-sm text-white/60">{f.d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
