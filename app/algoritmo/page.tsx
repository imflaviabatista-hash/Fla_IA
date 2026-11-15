import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui";
import { ALGORITHM_RULES } from "@/lib/algorithm";

export const metadata = { title: "Algoritmo · Perfilab" };

export default function AlgoritmoPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
      <section className="pt-10 sm:pt-16">
        <Badge>Base de conhecimento</Badge>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
          Como o algoritmo funciona, <span className="text-gradient">segundo a própria Meta</span>
        </h1>
        <p className="mt-4 max-w-2xl text-white/65">
          Toda análise da plataforma se apoia nessas regras. Só entra aqui o que a Meta publicou ou o que o Adam Mosseri, chefe do Instagram, falou
          publicamente. Cada item tem o link da fonte.
        </p>
      </section>

      <div className="mt-10 space-y-4">
        {ALGORITHM_RULES.map((r, i) => (
          <article key={r.id} className="card p-5 sm:p-6">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-sunset text-xs font-bold">{i + 1}</span>
              <Badge>{r.superficie}</Badge>
              <Badge tone={r.fonte.tipo === "Fala do Mosseri" ? "warn" : "good"}>{r.fonte.tipo}</Badge>
            </div>
            <h2 className="text-lg font-bold">{r.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">{r.oQueDiz}</p>
            <div className="mt-3 rounded-2xl bg-white/[0.04] p-3 text-sm text-white/70">
              <span className="font-semibold text-white/90">Como a plataforma usa: </span>
              {r.comoUsamos}
            </div>
            <a
              href={r.fonte.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/55 hover:text-white"
            >
              {r.fonte.nome} · {r.fonte.data} <ExternalLink className="h-3 w-3" />
            </a>
          </article>
        ))}
      </div>
    </main>
  );
}
