"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { postJson } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);

    try {
      await postJson("/auth/logout");
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="rounded border border-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-300 transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-hover)] disabled:cursor-not-allowed disabled:text-zinc-600"
    >
      {pending ? "Saindo…" : "Sair"}
    </button>
  );
}
