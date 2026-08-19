"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, getFeed, refreshFeed } from "@/lib/api-client";
import { formatFeedTimestamp, type FeedResponse } from "@/lib/feed";
import { FeedCard } from "./feed-card";

interface FeedSectionProps {
  feed: FeedResponse;
  onFeedChange: (feed: FeedResponse) => void;
  preferencesCount: number;
}

export function FeedSection({ feed, onFeedChange, preferencesCount }: FeedSectionProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Contagem regressiva de cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || cooldownSeconds > 0) return;

    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const refreshed = await refreshFeed();
      onFeedChange(refreshed);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "FEED_REFRESH_COOLDOWN") {
          const retryAfter =
            typeof error.details?.retryAfterSeconds === "number"
              ? error.details.retryAfterSeconds
              : 60;
          setCooldownSeconds(retryAfter);
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("Não foi possível atualizar o feed. Tente novamente.");
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, cooldownSeconds, onFeedChange]);

  const handleReload = useCallback(async () => {
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const reloaded = await getFeed();
      onFeedChange(reloaded);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Não foi possível carregar o feed. Tente novamente.");
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [onFeedChange]);

  const hasPreferences = preferencesCount > 0 || feed.interests.length > 0;
  const hasItems = feed.items.length > 0;
  const formattedDate = formatFeedTimestamp(feed.generatedAt);

  return (
    <section
      aria-labelledby="feed-heading"
      className="mt-6 rounded border border-zinc-800 bg-zinc-900 p-5"
    >
      {/* Cabeçalho do Feed */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="feed-heading" className="text-base font-semibold tracking-tight text-zinc-50">
              Seu Feed
            </h2>
            {feed.cached && !feed.stale && (
              <span className="rounded-sm border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-zinc-400">
                Em cache
              </span>
            )}
            {feed.stale && (
              <span className="rounded-sm border border-orange-800/70 bg-orange-950/40 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-orange-300">
                Modo contingência
              </span>
            )}
          </div>
          {formattedDate ? (
            <p className="mt-1 font-mono text-xs text-zinc-500">
              Última geração: <time dateTime={feed.generatedAt ?? undefined}>{formattedDate}</time>
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">
              Resumo inteligente das últimas notícias do mercado.
            </p>
          )}
        </div>

        {hasPreferences && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || cooldownSeconds > 0}
            aria-busy={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm font-semibold text-zinc-300 transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)] disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
          >
            {isRefreshing ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-[color:var(--accent)]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Gerando resumo…</span>
              </>
            ) : cooldownSeconds > 0 ? (
              <span className="font-mono">Aguarde {cooldownSeconds}s</span>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.75a.75.75 0 0 0-.75.75v4.482a.75.75 0 0 0 1.5 0v-2.298l.312.312a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.212-.763ZM4.688 8.576a5.5 5.5 0 0 1 9.201-2.466l.312.311H11.77a.75.75 0 0 0 0 1.5h4.482a.75.75 0 0 0 .75-.75V2.69a.75.75 0 0 0-1.5 0v2.298l-.312-.312A7 7 0 0 0 3.478 7.814a.75.75 0 0 0 1.21.762Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Atualizar feed</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Aviso de contingência / fallback stale */}
      {feed.warning && (
        <div
          role="status"
          className="mt-5 rounded border border-orange-900/60 bg-orange-950/20 p-3 text-sm text-orange-200"
        >
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>
            <p>{feed.warning}</p>
          </div>
        </div>
      )}

      {/* Alerta de erro recuperável */}
      {errorMessage && (
        <div
          role="alert"
          className="mt-5 flex flex-col gap-3 rounded border border-red-900/60 bg-red-950/30 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-red-300">{errorMessage}</p>
          <button
            type="button"
            onClick={handleReload}
            className="self-start rounded-sm bg-red-900/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-800 sm:self-auto"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Conteúdo do Feed */}
      <div className="mt-5">
        {!hasPreferences ? (
          <div className="rounded border border-dashed border-zinc-800 bg-zinc-950 p-6 text-center">
            <h3 className="text-sm font-semibold text-zinc-200">Nenhum interesse cadastrado</h3>
            <p className="mt-1.5 text-sm text-zinc-500">
              Adicione tópicos ou ativos na seção de interesses acima para que a inteligência
              artificial possa gerar seu resumo personalizado.
            </p>
          </div>
        ) : !hasItems ? (
          <div className="rounded border border-dashed border-zinc-800 bg-zinc-950 p-6 text-center">
            <h3 className="text-sm font-semibold text-zinc-200">
              Nenhuma notícia relevante encontrada hoje
            </h3>
            <p className="mt-1.5 text-sm text-zinc-500">
              {feed.message ??
                "Nenhum artigo recente do InfoMoney coincidiu diretamente com os seus interesses cadastrados. Experimente adicionar tópicos mais amplos ou atualizar mais tarde."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-1">
            {feed.items.map((item, index) => (
              <FeedCard key={`${item.url}-${index}`} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Aviso legal de não recomendação de investimento */}
      <footer className="mt-6 border-t border-zinc-900 pt-4">
        <p className="text-xs leading-relaxed text-zinc-500">
          <strong className="font-semibold text-zinc-400">Aviso:</strong> Os resumos apresentados
          são gerados por inteligência artificial com base em notícias públicas e possuem caráter
          estritamente informativo. Não constituem recomendação, consultoria ou análise de
          investimento para compra ou venda de quaisquer ativos financeiros.
        </p>
      </footer>
    </section>
  );
}
