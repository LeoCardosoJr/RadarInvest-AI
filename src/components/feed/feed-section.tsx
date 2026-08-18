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
      className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-8"
    >
      {/* Cabeçalho do Feed */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="feed-heading" className="text-xl font-semibold tracking-tight text-white">
              Seu Feed
            </h2>
            {feed.cached && !feed.stale && (
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                Em cache
              </span>
            )}
            {feed.stale && (
              <span className="rounded-full border border-amber-800/80 bg-amber-950/60 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                Modo contingência
              </span>
            )}
          </div>
          {formattedDate ? (
            <p className="mt-1 text-sm text-slate-400">
              Última geração: <time dateTime={feed.generatedAt ?? undefined}>{formattedDate}</time>
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-400">
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
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/50 disabled:text-slate-500"
          >
            {isRefreshing ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-emerald-400"
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
              <span>Aguarde {cooldownSeconds}s</span>
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
          className="mt-6 rounded-lg border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-200"
        >
          <div className="flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400"
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
          className="mt-6 flex flex-col gap-3 rounded-lg border border-red-900/60 bg-red-950/40 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-red-200">{errorMessage}</p>
          <button
            type="button"
            onClick={handleReload}
            className="self-start rounded-md bg-red-900/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-800 sm:self-auto"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Conteúdo do Feed */}
      <div className="mt-6">
        {!hasPreferences ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
            <h3 className="text-base font-semibold text-slate-200">Nenhum interesse cadastrado</h3>
            <p className="mt-2 text-sm text-slate-400">
              Adicione tópicos ou ativos na seção de interesses acima para que a inteligência
              artificial possa gerar seu resumo personalizado.
            </p>
          </div>
        ) : !hasItems ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
            <h3 className="text-base font-semibold text-slate-200">
              Nenhuma notícia relevante encontrada hoje
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {feed.message ??
                "Nenhum artigo recente do InfoMoney coincidiu diretamente com os seus interesses cadastrados. Experimente adicionar tópicos mais amplos ou atualizar mais tarde."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1">
            {feed.items.map((item, index) => (
              <FeedCard key={`${item.url}-${index}`} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Aviso legal de não recomendação de investimento */}
      <footer className="mt-8 border-t border-slate-900 pt-6">
        <p className="text-xs leading-relaxed text-slate-400">
          <strong className="font-semibold text-slate-300">Aviso:</strong> Os resumos apresentados
          são gerados por inteligência artificial com base em notícias públicas e possuem caráter
          estritamente informativo. Não constituem recomendação, consultoria ou análise de
          investimento para compra ou venda de quaisquer ativos financeiros.
        </p>
      </footer>
    </section>
  );
}
