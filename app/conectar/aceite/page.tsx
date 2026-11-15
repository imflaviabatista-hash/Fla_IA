import { Camera, Check, ShieldCheck, X } from "lucide-react";

export const metadata = { title: "Autorizar análise · Perfilab" };

const ERROS: Record<string, string> = {
  negado: "Você cancelou a autorização. Tudo bem! Se mudar de ideia, é só tentar de novo.",
  sessao: "O link expirou. Clica no botão de novo, por favor.",
  meta: "O Instagram não confirmou a autorização. Confere se o perfil é comercial ou de criador e tenta de novo.",
};

export default async function AceitePage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="mx-auto max-w-lg px-4 pb-24 pt-6 sm:pt-12">
      <div className="card p-6 sm:p-8">
        <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-sunset">
          <Camera className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Autoriza a análise do seu perfil?</h1>
        <p className="mt-2 text-white/65">
          Com a sua autorização, a gente consegue ver os números de dentro do seu Instagram e te mostrar o que realmente faz seu conteúdo chegar em gente nova.
        </p>

        {erro && ERROS[erro] && <p className="mt-4 rounded-2xl bg-amber-400/10 p-3 text-sm text-amber-100">{ERROS[erro]}</p>}

        <div className="mt-6 space-y-4 text-sm">
          <div>
            <p className="mb-2 font-bold">O que a gente vê</p>
            {["Alcance, salvamentos e envios dos seus posts", "Tempo médio assistido dos Reels", "Quanto do alcance veio de quem não te segue", "Idade, gênero e cidade dos seus seguidores"].map((x) => (
              <p key={x} className="mb-1.5 flex gap-2 text-white/80">
                <Check className="h-4 w-4 shrink-0 text-emerald-300" /> {x}
              </p>
            ))}
          </div>
          <div>
            <p className="mb-2 font-bold">O que a gente não faz</p>
            {["Não posta nada", "Não lê suas mensagens", "Não muda nada no seu perfil", "Não pede sua senha (o login é feito na Meta)"].map((x) => (
              <p key={x} className="mb-1.5 flex gap-2 text-white/80">
                <X className="h-4 w-4 shrink-0 text-rose-300" /> {x}
              </p>
            ))}
          </div>
        </div>

        <a
          href="/api/auth/instagram/start"
          className="mt-7 flex items-center justify-center gap-2 rounded-full bg-sunset py-3.5 text-base font-bold text-white shadow-lg shadow-pink-500/25 transition hover:brightness-110 active:scale-[0.98]"
        >
          <Camera className="h-5 w-5" /> Autorizar com Instagram ou Facebook
        </a>
        <p className="mt-4 flex items-start gap-2 text-xs text-white/45">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Funciona com perfil comercial ou de criador. Você escolhe qual conta compartilhar e pode tirar o acesso quando quiser, aqui ou nas configurações de integrações da Meta.
        </p>
      </div>
    </main>
  );
}
