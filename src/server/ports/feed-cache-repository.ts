export interface FeedItem {
  readonly title: string;
  readonly source: string;
  readonly url: string;
  readonly summary: string;
}

/** Contrato persistido em `content_json`; `cached`/`stale`/`warning` são compostos na resposta HTTP. */
export interface FeedContent {
  readonly interests: readonly string[];
  readonly items: readonly FeedItem[];
}

export interface FeedCacheRecord {
  readonly id: string;
  readonly userId: string;
  readonly cacheDate: string;
  readonly preferencesHash: string;
  readonly content: FeedContent;
  readonly generatedAt: Date;
}

export interface FeedCacheInput {
  readonly preferencesHash: string;
  readonly content: FeedContent;
}

export interface FeedCacheRepository {
  findForUserAndDate(userId: string, cacheDate: string): Promise<FeedCacheRecord | null>;
  /** Grava o cache do dia, sobrescrevendo qualquer geração anterior da mesma data. */
  upsertForUserAndDate(
    userId: string,
    cacheDate: string,
    input: FeedCacheInput,
  ): Promise<FeedCacheRecord>;
}
