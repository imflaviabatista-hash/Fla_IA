"use client";

import { Check, Copy, Link2, MessageCircle, ScanSearch, ShieldCheck, Trash2, Unlock } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Card } from "@/components/ui";

interface Data {
  configured: boolean;
  invite: string | null;
  items: { username: string; connectedAt: string; expiresAt: string; active: boolean }[];
}

export default function ConectarPage() {
  const [data, setData] = useState<Data | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => fetch("/api/connections").then((r) => r.json()).then(setData), []);
  useEffect(() => {
    load();
  }, [load]);

  const copy = async () => {
    if (!data?.invite) return;
    await navigator.clipboard.writeText(data.invite);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const whats = data?.invite
    ? `https://wa.me/?text=${encodeURIComponent(`Oi! Pra eu fazer a análise completa do seu Instagram, é só entrar nesse link e autorizar: ${data.invite}`)}`
    : "#";

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
      <section className="pt-6 sm:pt-10">
        <Badge>
          <Unlock className="h-3 w-3" /> Análise completa
        </Badge>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
          Quer ver <span className="text-gradient">os dados de dentro</span>? Manda o link.
        </h1>
        <p className="mt-3 max-w-2xl text-white/65">
          A pessoa entra com o Instagram dela, vê o que tá liberando e autoriza. Depois disso, a análise do perfil dela passa a usar os números reais.
        </p>
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.07]">
              <ScanSearch className="h-4 w-4" />
            </span>
            <p className="font-bold">Análise pública</p>
          </div>
          <p className="text-sm text-white/60">Só colar o @. Sem pedir nada pra ninguém.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-white/75">
            {["Seguidores e posts", "Curtidas e comentários", "Views dos Reels", "Nicho, hooks e temas com IA"].map((x) => (
              <li key={x} className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-300" /> {x}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="ring-1 ring-pink-400/30">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sunset">
              <Unlock className="h-4 w-4" />
            </span>
            <p className="font-bold">Análise completa (opt-in)</p>
          </div>
          <p className="text-sm text-white/60">Tudo da pública, mais os dados internos:</p>
          <ul className="mt-3 space-y-1.5 text-sm text-white/75">
            {[
              "Alcance real de cada post",
              "Quanto do alcance veio de quem não segue",
              "Envios por DM e salvamentos",
              "Tempo médio assistido dos Reels",
              "Idade, gênero e cidade dos seguidores",
            ].map((x) => (
              <li key={x} className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-pink-300" /> {x}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <p className="mb-1 flex items-center gap-2 font-bold">
          <Link2 className="h-4 w-4" /> Link de convite
        </p>
        {data?.configured ? (
          <>
            <p className="mb-3 text-sm text-white/60">Manda esse link pra pessoa. Serve pra qualquer perfil comercial ou de criador.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 truncate rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-white/80">{data.invite}</code>
              <button
                onClick={copy}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-ink transition active:scale-95"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiado!" : "Copiar"}
              </button>
              <a
                href={whats}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </>
        ) : (
          <div className="mt-2 rounded-2xl bg-amber-400/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">O opt-in ainda não foi configurado.</p>
            <p className="mt-1 text-amber-100/80">
              Preenche IG_APP_ID, IG_APP_SECRET e APP_URL no .env (o passo a passo tá no README). Enquanto isso, dá pra ver como fica a análise completa com o
              perfil{" "}
              <Link href="/perfil/demo.completo" className="font-bold underline">
                @demo.completo
              </Link>
              .
            </p>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <p className="mb-3 font-bold">Perfis que autorizaram</p>
        {data?.items.length ? (
          <ul className="divide-y divide-white/[0.06]">
            {data.items.map((c) => (
              <li key={c.username} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">@{c.username}</p>
                  <p className="text-xs text-white/45">
                    Autorizou em {new Date(c.connectedAt).toLocaleDateString("pt-BR")} ·{" "}
                    {c.active ? `acesso até ${new Date(c.expiresAt).toLocaleDateString("pt-BR")}` : "acesso expirado"}
                  </p>
                </div>
                <Link
                  href={`/perfil/${c.username}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sunset px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 active:scale-95"
                >
                  <ScanSearch className="h-3.5 w-3.5" /> Analisar
                </Link>
                <button
                  onClick={async () => {
                    if (!confirm(`Remover o acesso de @${c.username}? A plataforma apaga o token na hora.`)) return;
                    await fetch(`/api/connections?u=${c.username}`, { method: "DELETE" });
                    load();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-4 py-2 text-xs font-semibold text-white/75 transition hover:bg-rose-500/20 hover:text-rose-200"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/50">Ninguém autorizou ainda.</p>
        )}
      </Card>

      <p className="mt-6 flex items-start gap-2 text-xs text-white/45">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        A autorização é feita no próprio Instagram, só com permissão de leitura. A plataforma não posta, não lê DMs e não muda nada no perfil. A pessoa pode
        tirar o acesso quando quiser, aqui ou nas configurações do Instagram.
      </p>
    </main>
  );
}
