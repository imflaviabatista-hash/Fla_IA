"use client";

import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Não deu pra entrar.");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu pra entrar.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 pb-16">
      <form onSubmit={submit} className="card animate-pop w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-sunset text-2xl font-extrabold shadow-lg shadow-pink-500/25">P</div>
        <h1 className="text-2xl font-extrabold tracking-tight">Entrar na Perfilab</h1>
        <p className="mt-1 text-sm text-white/55">Acesso só pra equipe.</p>

        <label className="mt-6 block text-xs font-semibold text-white/60">E-mail</label>
        <div className="mt-1.5 flex items-center gap-2 rounded-2xl bg-white/[0.06] px-3 ring-1 ring-transparent focus-within:ring-pink-400/50">
          <Mail className="h-4 w-4 text-white/40" />
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent py-3 text-sm outline-none"
            autoFocus
          />
        </div>

        <label className="mt-4 block text-xs font-semibold text-white/60">Senha</label>
        <div className="mt-1.5 flex items-center gap-2 rounded-2xl bg-white/[0.06] px-3 ring-1 ring-transparent focus-within:ring-pink-400/50">
          <Lock className="h-4 w-4 text-white/40" />
          <input
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent py-3 text-sm outline-none"
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="text-white/40 hover:text-white" aria-label={show ? "Esconder senha" : "Mostrar senha"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && <p className="animate-fade mt-4 rounded-2xl bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p>}

        <button
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-sunset py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"} {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
        <p className="mt-4 text-center text-xs text-white/40">Esqueceu a senha? Pede pra administradora criar uma nova.</p>
      </form>
    </main>
  );
}
