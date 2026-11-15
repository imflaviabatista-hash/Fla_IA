"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Buscando o perfil na API da Meta",
  "Lendo os posts e Reels",
  "Calculando engajamento e formatos",
  "Lendo temas, hooks e narrativas",
  "Calculando o potencial de furar a bolha",
];

export function Loading({ handle }: { handle: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="ring-story mb-6 h-24 w-24 animate-spin [animation-duration:3s]">
        <div className="h-full w-full rounded-full bg-ink" />
      </div>
      <h1 className="text-2xl font-extrabold">Analisando @{handle}</h1>
      <p className="mt-1 text-sm text-white/55">A análise com IA pode levar até 2 minutos.</p>
      <ul className="mt-8 w-full space-y-2 text-left text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 transition ${i <= step ? "bg-white/[0.06] text-white" : "text-white/35"}`}>
            <span className={`h-2 w-2 rounded-full ${i < step ? "bg-emerald-400" : i === step ? "animate-pulse bg-pink-400" : "bg-white/20"}`} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
