import Link from "next/link";

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
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Criar conta
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-700 px-5 py-2.5 font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
          >
            Entrar
          </Link>
        </div>
        <p className="mt-8 text-sm text-slate-400">
          Curadoria inteligente de notícias, preferências personalizadas e resumos diários por
          inteligência artificial.
        </p>
      </section>
    </main>
  );
}
