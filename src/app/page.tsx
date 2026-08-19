import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
      <section className="max-w-3xl">
        <Wordmark className="mb-4" />
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          O mercado em foco, de acordo com os seus interesses.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400">
          Acompanhe notícias financeiras relevantes em um feed filtrado e resumido por inteligência
          artificial.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded bg-[color:var(--accent-solid)] px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-[color:var(--accent-solid-hover)]"
          >
            Criar conta
          </Link>
          <Link
            href="/login"
            className="rounded border border-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
          >
            Entrar
          </Link>
        </div>
        <p className="mt-8 text-sm text-zinc-500">
          Curadoria inteligente de notícias, preferências personalizadas e resumos por inteligência
          artificial.
        </p>
      </section>
    </main>
  );
}
