import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { Wordmark } from "@/components/brand/wordmark";
import { serializeFeed } from "@/app/feed/route";
import { authenticateAccessToken } from "@/server/auth/authenticate-request";
import { SESSION_COOKIE_NAME } from "@/server/auth/session-cookie";
import { getContainer } from "@/server/composition/container";
import { DashboardView } from "./dashboard-view";

// A sessão é lida a cada request; nada da área autenticada é pré-renderizado.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const container = getContainer();
  const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
  const auth = await authenticateAccessToken(sessionToken, container.authentication);

  if (!auth) {
    redirect("/login");
  }

  let user;
  let preferences;
  let initialFeedResult;

  try {
    [user, preferences, initialFeedResult] = await Promise.all([
      container.authentication.userRepository.findPublicById(auth.userId),
      container.preferencesService.listPreferences(auth.userId),
      container.feedService.getFeed(auth.userId).catch(() => ({
        generatedAt: null,
        interests: [] as readonly string[],
        items: [],
        cached: false,
        stale: false,
        message: "Não foi possível carregar o feed automaticamente. Use o botão atualizar abaixo.",
      })),
    ]);
  } catch {
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  const initialPreferences = preferences.map((preference) => ({
    id: preference.id,
    topic: preference.topic,
    createdAt: preference.createdAt.toISOString(),
  }));

  const initialFeed = serializeFeed(initialFeedResult);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <Wordmark />
        <LogoutButton />
      </header>

      <DashboardView
        user={user}
        initialPreferences={initialPreferences}
        initialFeed={initialFeed}
      />
    </main>
  );
}
