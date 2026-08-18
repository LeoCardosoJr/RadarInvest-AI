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
          "Nenhum interesse cadastrado. Adicione tópicos acima para gerar seu resumo diário.",
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
      <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-950/60 p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Olá, {user.name}.</h1>
        <p className="mt-2 text-sm text-slate-400">{user.email}</p>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Gerencie abaixo os interesses e tópicos financeiros que guiarão a curadoria e os resumos
          diários de notícias gerados por IA.
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
