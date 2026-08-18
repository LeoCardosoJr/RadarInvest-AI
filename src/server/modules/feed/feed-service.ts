import {
  AiInvalidResponseError,
  AiUnavailableError,
  FeedRefreshCooldownError,
  NewsUnavailableError,
} from "../../errors/app-error";
import type { AiProvider } from "../../ports/ai-provider";
import type {
  FeedCacheRecord,
  FeedCacheRepository,
  FeedContent,
  FeedItem,
} from "../../ports/feed-cache-repository";
import type { NewsProvider } from "../../ports/news-provider";
import type { PreferenceRecord, PreferencesRepository } from "../../ports/preferences-repository";
import { computePreferencesHash } from "../preferences/preferences-normalizer";
import { currentCacheDate } from "./feed-date";

export interface FeedResult {
  readonly generatedAt: Date | null;
  readonly interests: readonly string[];
  readonly items: readonly FeedItem[];
  readonly cached: boolean;
  readonly stale: boolean;
  readonly message?: string;
  readonly warning?: string;
}

export interface FeedServiceConfig {
  readonly timeZone: string;
  readonly refreshCooldownSeconds: number;
}

const NO_PREFERENCES_MESSAGE = "Adicione interesses para receber seu feed personalizado.";
const STALE_FALLBACK_WARNING =
  "Não foi possível atualizar o feed agora; exibindo a última versão gerada com sucesso.";

function isRecoverableFeedError(error: unknown): boolean {
  return (
    error instanceof NewsUnavailableError ||
    error instanceof AiUnavailableError ||
    error instanceof AiInvalidResponseError
  );
}

function emptyResult(): FeedResult {
  return {
    generatedAt: null,
    interests: [],
    items: [],
    cached: false,
    stale: false,
    message: NO_PREFERENCES_MESSAGE,
  };
}

function resultFromCache(
  record: FeedCacheRecord,
  cached: boolean,
  stale = false,
  warning?: string,
): FeedResult {
  return {
    generatedAt: record.generatedAt,
    interests: record.content.interests,
    items: record.content.items,
    cached,
    stale,
    ...(warning ? { warning } : {}),
  };
}

export class FeedService {
  constructor(
    private readonly aiProvider: AiProvider,
    private readonly newsProvider: NewsProvider,
    private readonly preferencesRepository: PreferencesRepository,
    private readonly feedCacheRepository: FeedCacheRepository,
    private readonly config: FeedServiceConfig,
  ) {}

  async getFeed(userId: string): Promise<FeedResult> {
    const context = await this.loadContext(userId);

    if (!context) {
      return emptyResult();
    }

    const { preferences, cacheDate, hash, existing } = context;

    if (existing && existing.preferencesHash === hash) {
      return resultFromCache(existing, true);
    }

    const content = await this.generateFeed(preferences);
    const saved = await this.feedCacheRepository.upsertForUserAndDate(userId, cacheDate, {
      preferencesHash: hash,
      content,
    });

    return resultFromCache(saved, false);
  }

  async refreshFeed(userId: string): Promise<FeedResult> {
    const context = await this.loadContext(userId);

    if (!context) {
      return emptyResult();
    }

    const { preferences, cacheDate, hash, existing } = context;

    // Cooldown só vale para o mesmo conjunto de interesses; se mudaram, o usuário
    // precisa poder gerar o resumo novo imediatamente.
    if (existing && existing.preferencesHash === hash) {
      // Math.max evita cooldown negativo/estendido em caso de dessincronização de relógio.
      const elapsedSeconds = Math.max(0, (Date.now() - existing.generatedAt.getTime()) / 1000);
      const remainingSeconds = this.config.refreshCooldownSeconds - elapsedSeconds;

      if (remainingSeconds > 0) {
        throw new FeedRefreshCooldownError(Math.ceil(remainingSeconds));
      }
    }

    try {
      const content = await this.generateFeed(preferences);
      const saved = await this.feedCacheRepository.upsertForUserAndDate(userId, cacheDate, {
        preferencesHash: hash,
        content,
      });

      return resultFromCache(saved, false);
    } catch (error) {
      // Fallback só é compatível quando o cache existente reflete os mesmos interesses vigentes.
      if (existing && existing.preferencesHash === hash && isRecoverableFeedError(error)) {
        return resultFromCache(existing, true, true, STALE_FALLBACK_WARNING);
      }

      throw error;
    }
  }

  /** Preferências, data lógica, hash e cache do dia; `null` quando o usuário não tem interesses. */
  private async loadContext(userId: string): Promise<{
    preferences: PreferenceRecord[];
    cacheDate: string;
    hash: string;
    existing: FeedCacheRecord | null;
  } | null> {
    const preferences = await this.preferencesRepository.listForUser(userId);

    if (preferences.length === 0) {
      return null;
    }

    const cacheDate = currentCacheDate(this.config.timeZone);
    const hash = hashOf(preferences);
    const existing = await this.feedCacheRepository.findForUserAndDate(userId, cacheDate);

    return { preferences, cacheDate, hash, existing };
  }

  /** Uma chamada agrupada à IA por geração; título, URL e fonte nunca vêm da IA. */
  private async generateFeed(preferences: PreferenceRecord[]): Promise<FeedContent> {
    const interests = preferences.map((preference) => preference.topic);
    const news = await this.newsProvider.fetchLatestNews();

    // Sem notícias não há o que resumir: poupa a chamada à IA e o risco de falha dela.
    if (news.length === 0) {
      return { interests, items: [] };
    }

    const newsById = new Map(news.map((item) => [item.id, item]));

    const summary = await this.aiProvider.summarize({
      interests,
      news: news.map((item) => ({ id: item.id, title: item.title, description: item.description })),
    });

    const items: FeedItem[] = [];

    for (const summaryItem of summary.items) {
      const source = newsById.get(summaryItem.newsId);

      // IDs desconhecidos (inventados ou removidos após a busca) são descartados.
      if (!source) {
        continue;
      }

      items.push({
        title: source.title,
        source: source.source,
        url: source.url,
        summary: summaryItem.summary,
      });
    }

    return { interests, items };
  }
}

function hashOf(preferences: PreferenceRecord[]): string {
  return computePreferencesHash(preferences.map((preference) => preference.normalizedTopic));
}
