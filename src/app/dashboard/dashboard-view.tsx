"use client";

import { useCallback, useState } from "react";

import { FeedSection } from "@/components/feed/feed-section";
import { PreferencesEditor } from "@/components/preferences/preferences-editor";
import { getFeed } from "@/lib/api-client";
import type { FeedResponse } from "@/lib/feed";

interface PreferenceItem {
  id: string;
  topic: string;
  createdAt: string;
}

interface DashboardViewProps {
  user: {
    name: string;
    email: string;
  };
  initialPreferences: PreferenceItem[];
  initialFeed: FeedResponse;
}

export function DashboardView({ user, initialPreferences, initialFeed }: DashboardViewProps) {
  const [preferencesCount, setPreferencesCount] = useState(initialPreferences.length);
  const [feed, setFeed] = useState<FeedResponse>(initialFeed);

  const handlePreferencesUpdated = useCallback(async (newPreferences: PreferenceItem[]) => {
    setPreferencesCount(newPreferences.length);

    if (newPreferences.length === 0) {
      setFeed({
        generatedAt: null,
        interests: [],
        items: [],
        cached: false,
        stale: false,
        message:
          "Nenhum interesse cadastrado. Adicione tópicos acima para gerar seu resumo de notícias.",
      });
      return;
    }

    try {
      const updatedFeed = await getFeed();
      setFeed(updatedFeed);
    } catch {
      // Se falhar o getFeed automático, o usuário pode clicar em tentar novamente na seção do feed
    }
  }, []);

  return (
    <>
      <section className="mt-8 rounded border border-zinc-800 bg-zinc-900 p-5">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">Olá, {user.name}.</h1>
        <p className="mt-1 font-mono text-xs text-zinc-500">{user.email}</p>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Gerencie abaixo os interesses e tópicos financeiros que guiarão a curadoria e os resumos
          de notícias gerados por IA.
        </p>
      </section>

      <PreferencesEditor
        initialPreferences={initialPreferences}
        onUpdated={handlePreferencesUpdated}
      />

      <FeedSection feed={feed} onFeedChange={setFeed} preferencesCount={preferencesCount} />
    </>
  );
}
