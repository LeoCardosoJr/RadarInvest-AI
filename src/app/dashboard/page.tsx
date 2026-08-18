import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { PreferencesEditor } from "@/components/preferences/preferences-editor";
import { authenticateAccessToken } from "@/server/auth/authenticate-request";
import { SESSION_COOKIE_NAME } from "@/server/auth/session-cookie";
import { getContainer } from "@/server/composition/container";

// A sessão é lida a cada request; nada da área autenticada é pré-renderizado.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const container = getContainer();
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
  const auth = await authenticateAccessToken(sessionToken, container.authentication);

  if (!auth) {
    redirect("/login");
  }

  const [user, preferences] = await Promise.all([
    container.authentication.userRepository.findPublicById(auth.userId),
    container.preferencesService.listPreferences(auth.userId),
  ]);

  if (!user) {
    redirect("/login");
  }

  const initialPreferences = preferences.map((preference) => ({
    id: preference.id,
    topic: preference.topic,
    createdAt: preference.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16">
      <header className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
          RadarInvest AI
        </p>
        <LogoutButton />
      </header>

      <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-950/60 p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Olá, {user.name}.</h1>
        <p className="mt-2 text-sm text-slate-400">{user.email}</p>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Gerencie abaixo os interesses e tópicos financeiros que guiarão a curadoria e os resumos
          diários de notícias gerados por IA.
        </p>
      </section>

      <PreferencesEditor initialPreferences={initialPreferences} />
    </main>
  );
}
