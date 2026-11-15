"use client";

import Link from "next/link";
import { use } from "react";
import { Dashboard } from "@/components/Dashboard";
import { Loading } from "@/components/Loading";
import { useAnalysis } from "@/components/useAnalysis";

export default function PerfilPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const { data, error, running, run } = useAnalysis(handle);

  if (error && !data)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-4xl">😕</p>
        <h1 className="mt-4 text-xl font-extrabold">Não deu pra analisar @{handle}</h1>
        <p className="mt-2 text-sm text-white/65">{error}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={run} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ink">
            Tentar de novo
          </button>
          <Link href="/" className="rounded-full bg-white/[0.07] px-4 py-2 text-sm font-semibold">
            Voltar
          </Link>
        </div>
      </div>
    );

  if (!data) return <Loading handle={handle} />;
  return <Dashboard analysis={data} onRefresh={run} refreshing={running} />;
}
