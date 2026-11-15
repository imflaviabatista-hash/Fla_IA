import { PartyPopper } from "lucide-react";

export const metadata = { title: "Tudo certo · Perfilab" };

export default async function ObrigadoPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const { u } = await searchParams;
  return (
    <main className="mx-auto max-w-lg px-4 pb-24 pt-10 text-center sm:pt-16">
      <div className="card p-8">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-sunset">
          <PartyPopper className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold">Prontinho{u ? `, @${u}` : ""}!</h1>
        <p className="mt-2 text-white/65">Sua autorização chegou. Agora é com a gente: em breve você recebe a análise completa do seu perfil.</p>
        <p className="mt-4 text-xs text-white/40">Pode fechar essa página.</p>
      </div>
    </main>
  );
}
