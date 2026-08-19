import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand/wordmark";

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
      <Link href="/" className="mb-6 inline-block">
        <Wordmark />
      </Link>
      <section className="rounded border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        <p className="mt-1.5 text-sm leading-6 text-zinc-400">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
      {footer ? <div className="mt-5 text-center text-sm text-zinc-500">{footer}</div> : null}
    </main>
  );
}
