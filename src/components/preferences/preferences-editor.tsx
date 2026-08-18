"use client";

import { useState, type FormEvent } from "react";

import { ApiError, putJson } from "@/lib/api-client";
import {
  cleanTopicPresentation,
  MAX_PREFERENCES_COUNT,
  MAX_TOPIC_LENGTH,
  normalizeTopic,
} from "@/lib/preferences";

interface PreferenceItem {
  id: string;
  topic: string;
  createdAt: string;
}

interface PreferencesResponse {
  interests: PreferenceItem[];
}

interface PreferencesEditorProps {
  initialPreferences: PreferenceItem[];
}

export function PreferencesEditor({ initialPreferences }: PreferencesEditorProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [topic, setTopic] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const topicLength = cleanTopicPresentation(topic).length;

  async function savePreferences(topics: string[], successMessage: string): Promise<boolean> {
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await putJson<PreferencesResponse>("/preferences", { topics });
      setPreferences(response.interests);
      setFeedback({ tone: "success", text: successMessage });
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.message : "Não foi possível salvar suas preferências.";
      setFeedback({ tone: "error", text: errorMessage });
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function addPreference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTopic = cleanTopicPresentation(topic);

    if (!cleanTopic) {
      return;
    }

    if (cleanTopic.length > MAX_TOPIC_LENGTH) {
      setFeedback({
        tone: "error",
        text: `O interesse deve ter no máximo ${MAX_TOPIC_LENGTH} caracteres.`,
      });
      return;
    }

    if (preferences.length >= MAX_PREFERENCES_COUNT) {
      setFeedback({
        tone: "error",
        text: `Você já atingiu o limite de ${MAX_PREFERENCES_COUNT} interesses cadastrados.`,
      });
      return;
    }

    const normalizedTopic = normalizeTopic(cleanTopic);
    const alreadyExists = preferences.some(
      (preference) => normalizeTopic(preference.topic) === normalizedTopic,
    );

    if (alreadyExists) {
      setFeedback({
        tone: "error",
        text: "Este interesse já está cadastrado.",
      });
      return;
    }

    const topics = [...preferences.map((preference) => preference.topic), cleanTopic];
    const saved = await savePreferences(topics, `"${cleanTopic}" adicionado aos seus interesses.`);

    if (saved) {
      setTopic("");
    }
  }

  async function removePreference(id: string, topic: string) {
    const topics = preferences
      .filter((preference) => preference.id !== id)
      .map((preference) => preference.topic);

    await savePreferences(topics, `"${topic}" removido com sucesso.`);
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-8">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">Seus Interesses</h2>
          <p className="mt-1 text-sm text-slate-400">
            Defina ativos, setores ou temas para personalizar seu resumo diário.
          </p>
        </div>
        <span className="self-start rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-400 sm:self-auto">
          {preferences.length} / {MAX_PREFERENCES_COUNT} interesses
        </span>
      </div>

      <form onSubmit={addPreference} className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              disabled={isSaving || preferences.length >= MAX_PREFERENCES_COUNT}
              placeholder="Ex.: PETR4, VALE3, Selic, setor bancário..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:bg-slate-800/50"
            />
            {topic.length > 0 && (
              <span className="absolute right-3 top-2.5 text-xs text-slate-500">
                {topicLength}/{MAX_TOPIC_LENGTH}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSaving || !topic.trim() || preferences.length >= MAX_PREFERENCES_COUNT}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isSaving ? "Salvando…" : "Adicionar"}
          </button>
        </div>
      </form>

      {feedback && (
        <p
          role={feedback.tone === "error" ? "alert" : "status"}
          className={`mt-4 rounded-lg border px-3.5 py-2 text-sm ${
            feedback.tone === "error"
              ? "border-red-900/60 bg-red-950/40 text-red-200"
              : "border-emerald-900/60 bg-emerald-950/40 text-emerald-200"
          }`}
        >
          {feedback.text}
        </p>
      )}

      <div className="mt-6">
        {preferences.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center">
            <p className="text-sm text-slate-400">Nenhum interesse cadastrado no momento.</p>
            <p className="mt-1 text-xs text-slate-500">
              Adicione tópicos como ações, commodities ou indicadores macroeconômicos acima.
            </p>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {preferences.map((preference) => (
              <li
                key={preference.id}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-sm font-medium text-slate-200"
              >
                <span>{preference.topic}</span>
                <button
                  type="button"
                  onClick={() => removePreference(preference.id, preference.topic)}
                  disabled={isSaving}
                  aria-label={`Remover interesse ${preference.topic}`}
                  className="rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-red-300 disabled:cursor-not-allowed"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
