export const metadata = { title: "Política de privacidade · Perfilab" };

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-lg font-bold">{children}</h2>;

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <article className="card p-6 text-[15px] leading-relaxed text-white/80 sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Política de privacidade</h1>
        <p className="mt-2 text-sm text-white/50">Última atualização: 15 de novembro de 2026</p>

        <p className="mt-6">
          A Perfilab é uma plataforma de análise de perfis do Instagram, criada por Flávia Batista. Aqui a gente explica, de forma simples, quais dados usa e
          como cuida deles.
        </p>

        <H>Quais dados a gente usa</H>
        <p className="mt-2">
          <b className="text-white">Análise pública:</b> dados que a Meta disponibiliza pela API oficial sobre contas profissionais (comerciais ou de criador):
          nome de usuário, nome, bio, foto, número de seguidores e de posts, e os posts recentes com legenda, curtidas, comentários e views dos Reels.
        </p>
        <p className="mt-2">
          <b className="text-white">Análise completa (opt-in):</b> só quando o dono do perfil autoriza pelo login da Meta. Nesse caso a gente lê, além dos dados
          públicos, as métricas internas da conta: alcance, salvamentos, compartilhamentos, tempo médio assistido dos Reels, alcance de seguidores e não
          seguidores e dados agregados do público (idade, gênero e cidade). As permissões pedidas são só de leitura.
        </p>

        <H>O que a gente não faz</H>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Não publica, edita nem apaga nada no perfil.</li>
          <li>Não lê mensagens diretas.</li>
          <li>Não pede nem guarda senhas. O login é feito na própria Meta.</li>
          <li>Não vende nem compartilha os dados com terceiros para publicidade.</li>
        </ul>

        <H>Como os dados são usados</H>
        <p className="mt-2">
          Só pra gerar as análises, os dashboards e as apresentações da plataforma. As legendas, os números e as capas dos posts podem ser enviados para um
          serviço de inteligência artificial (Anthropic) apenas para gerar a análise qualitativa. A Anthropic não usa esses dados para treinar modelos.
        </p>

        <H>Por quanto tempo ficam guardados</H>
        <p className="mt-2">
          As análises ficam guardadas enquanto forem úteis pra quem usa a plataforma. A autorização do opt-in fica guardada até a pessoa remover o acesso.
          Quando o acesso é removido, a gente apaga o token na hora.
        </p>

        <H>Como remover o acesso e pedir a exclusão</H>
        <p className="mt-2">
          Veja o passo a passo na página de{" "}
          <a href="/exclusao-de-dados" className="font-semibold text-white underline">
            exclusão de dados
          </a>
          .
        </p>

        <H>Contato</H>
        <p className="mt-2">Dúvidas sobre privacidade: fala com a Flávia Batista pelo Instagram @flaviabatistabr.</p>
      </article>
    </main>
  );
}
