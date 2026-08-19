"use client";

import { useRef, useState, type FormEvent } from "react";

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
  onUpdated?: (newPreferences: PreferenceItem[]) => void;
}

export function PreferencesEditor({ initialPreferences, onUpdated }: PreferencesEditorProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [topic, setTopic] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const topicLength = cleanTopicPresentation(topic).length;

  async function savePreferences(topics: string[], successMessage: string): Promise<boolean> {
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await putJson<PreferencesResponse>("/preferences", { topics });
      setPreferences(response.interests);
      setFeedback({ tone: "success", text: successMessage });
      onUpdated?.(response.interests);
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
      inputRef.current?.focus();
      return;
    }

    if (cleanTopic.length > MAX_TOPIC_LENGTH) {
      setFeedback({
        tone: "error",
        text: `O interesse deve ter no máximo ${MAX_TOPIC_LENGTH} caracteres.`,
      });
      inputRef.current?.focus();
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
      inputRef.current?.focus();
      return;
    }

    const topics = [...preferences.map((preference) => preference.topic), cleanTopic];
    const saved = await savePreferences(topics, `"${cleanTopic}" adicionado aos seus interesses.`);

    if (saved) {
      setTopic("");
    }

    // Devolve o foco ao input para permitir adicionar novos termos consecutivamente
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  async function removePreference(id: string, topic: string) {
    const topics = preferences
      .filter((preference) => preference.id !== id)
      .map((preference) => preference.topic);

    await savePreferences(topics, `"${topic}" removido com sucesso.`);
  }

  return (
    <section className="mt-6 rounded border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-50">Seus Interesses</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Defina ativos, setores ou temas para personalizar seu resumo de notícias.
          </p>
        </div>
        <span className="self-start rounded-sm border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-400 sm:self-auto">
          {preferences.length}/{MAX_PREFERENCES_COUNT}
        </span>
      </div>

      <form onSubmit={addPreference} className="mt-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              disabled={isSaving || preferences.length >= MAX_PREFERENCES_COUNT}
              placeholder="Ex.: PETR4, VALE3, Selic, setor bancário..."
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-ring)] disabled:cursor-not-allowed disabled:bg-zinc-900"
            />
            {topic.length > 0 && (
              <span className="absolute right-3 top-2.5 font-mono text-xs text-zinc-600">
                {topicLength}/{MAX_TOPIC_LENGTH}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSaving || !topic.trim() || preferences.length >= MAX_PREFERENCES_COUNT}
            className="inline-flex items-center justify-center rounded bg-[color:var(--accent-solid)] px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-[color:var(--accent-solid-hover)] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isSaving ? "Salvando…" : "Adicionar"}
          </button>
        </div>
      </form>

      {feedback && (
        <p
          role={feedback.tone === "error" ? "alert" : "status"}
          className={`mt-3 rounded border px-3 py-1.5 text-sm ${
            feedback.tone === "error"
              ? "border-red-900/60 bg-red-950/40 text-red-300"
              : "border-[color:var(--accent-soft-border)] bg-[color:var(--accent-soft-bg)] text-[color:var(--accent-hover)]"
          }`}
        >
          {feedback.text}
        </p>
      )}

      <div className="mt-5">
        {preferences.length === 0 ? (
          <div className="rounded border border-dashed border-zinc-800 bg-zinc-950 p-5 text-center">
            <p className="text-sm text-zinc-400">Nenhum interesse cadastrado no momento.</p>
            <p className="mt-1 text-xs text-zinc-600">
              Adicione tópicos como ações, commodities ou indicadores macroeconômicos acima.
            </p>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {preferences.map((preference) => (
              <li
                key={preference.id}
                className="inline-flex items-center gap-2 rounded-sm border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-sm text-zinc-200"
              >
                <span>{preference.topic}</span>
                <button
                  type="button"
                  onClick={() => removePreference(preference.id, preference.topic)}
                  disabled={isSaving}
                  aria-label={`Remover interesse ${preference.topic}`}
                  className="rounded-sm text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed"
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
