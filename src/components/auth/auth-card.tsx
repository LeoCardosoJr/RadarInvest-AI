import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link
        href="/"
        className="mb-8 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300"
      >
        RadarInvest AI
      </Link>
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        <div className="mt-8">{children}</div>
      </section>
      {footer ? <div className="mt-6 text-center text-sm text-slate-400">{footer}</div> : null}
    </main>
  );
}
