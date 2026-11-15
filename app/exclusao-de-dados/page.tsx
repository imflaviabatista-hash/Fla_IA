export const metadata = { title: "Exclusão de dados · Perfilab" };

export default function ExclusaoPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <article className="card p-6 text-[15px] leading-relaxed text-white/80 sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Exclusão de dados</h1>
        <p className="mt-4">Você pode tirar o acesso da Perfilab e pedir a exclusão dos seus dados quando quiser. É só seguir um destes caminhos:</p>

        <h2 className="mt-8 text-lg font-bold text-white">1. Remover o acesso pela Meta</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>No Facebook ou no Meta Business Suite, abra as configurações da empresa.</li>
          <li>Vá em Integrações e depois em Integrações conectadas.</li>
          <li>Escolha Perfilab e clique em Remover.</li>
        </ol>
        <p className="mt-2">Assim que o acesso é removido, a autorização deixa de funcionar e a plataforma não consegue mais ler nenhum dado da sua conta.</p>

        <h2 className="mt-8 text-lg font-bold text-white">2. Pedir a exclusão pra gente</h2>
        <p className="mt-2">
          Mande uma mensagem pra @flaviabatistabr no Instagram dizendo &ldquo;quero excluir meus dados da Perfilab&rdquo; e o seu @. A gente apaga a
          autorização e as análises do seu perfil em até 7 dias e te avisa quando terminar.
        </p>
      </article>
    </main>
  );
}
