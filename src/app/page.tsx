export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
      <section className="max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
          RadarInvest AI
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          O mercado em foco, de acordo com os seus interesses.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Acompanhe notícias financeiras relevantes em um feed diário, filtrado e resumido por
          inteligência artificial.
        </p>
        <p className="mt-10 text-sm text-slate-400">
          Estrutura inicial pronta. Autenticação, preferências e feed serão adicionados nas próximas
          etapas.
        </p>
      </section>
    </main>
  );
}
