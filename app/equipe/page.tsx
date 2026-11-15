"use client";

import { Crown, Trash2, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge, Card } from "@/components/ui";

interface Data {
  admin: string | null;
  users: { email: string; name: string; role: string; createdAt: string }[];
}

export default function EquipePage() {
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => fetch("/api/users").then((r) => r.json()).then(setData), []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const j = await res.json();
    setSaving(false);
    if (!res.ok) return setMsg({ ok: false, text: j.error });
    setMsg({ ok: true, text: `${j.name} já pode entrar com o e-mail ${j.email}. Passa a senha pra pessoa por um canal seguro.` });
    setForm({ name: "", email: "", password: "" });
    load();
  };

  const input = "w-full rounded-2xl bg-white/[0.06] px-3 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-pink-400/50";

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <section className="pb-6 pt-6 sm:pt-10">
        <Badge>
          <Users className="h-3 w-3" /> Equipe
        </Badge>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Quem pode entrar na plataforma</h1>
        <p className="mt-2 text-white/60">Cada pessoa entra com o próprio e-mail e senha. Só você vê essa página.</p>
      </section>

      <Card>
        <p className="mb-4 flex items-center gap-2 font-bold">
          <UserPlus className="h-4 w-4" /> Adicionar pessoa
        </p>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-3">
          <input className={input} placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className={input} placeholder="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input
            className={input}
            placeholder="Senha (mín. 8)"
            type="text"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
          <button
            disabled={saving}
            className="rounded-full bg-sunset py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 sm:col-span-3"
          >
            {saving ? "Salvando..." : "Adicionar"}
          </button>
        </form>
        {msg && <p className={`animate-fade mt-3 rounded-2xl px-3 py-2 text-sm ${msg.ok ? "bg-emerald-400/10 text-emerald-200" : "bg-rose-400/10 text-rose-200"}`}>{msg.text}</p>}
      </Card>

      <Card className="mt-6">
        <p className="mb-2 font-bold">Pessoas com acesso</p>
        <ul className="divide-y divide-white/[0.06]">
          {data?.admin && (
            <li className="flex items-center gap-3 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-sunset">
                <Crown className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{data.admin}</p>
                <p className="text-xs text-white/45">Administradora · senha definida na Vercel</p>
              </div>
            </li>
          )}
          {data?.users.map((u) => (
            <li key={u.email} className="flex items-center gap-3 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] font-bold">{u.name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.name}</p>
                <p className="truncate text-xs text-white/45">
                  {u.email} · desde {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!confirm(`Tirar o acesso de ${u.name}?`)) return;
                  await fetch(`/api/users?email=${encodeURIComponent(u.email)}`, { method: "DELETE" });
                  load();
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white/75 transition hover:bg-rose-500/20 hover:text-rose-200"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </button>
            </li>
          ))}
          {data && !data.users.length && <li className="py-3 text-sm text-white/45">Só você por enquanto.</li>}
        </ul>
      </Card>
    </main>
  );
}
