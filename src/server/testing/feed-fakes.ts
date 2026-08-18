import { randomUUID } from "node:crypto";

import type {
  FeedCacheInput,
  FeedCacheRecord,
  FeedCacheRepository,
} from "../ports/feed-cache-repository";

export class InMemoryFeedCacheRepository implements FeedCacheRepository {
  private readonly records = new Map<string, FeedCacheRecord>();

  private key(userId: string, cacheDate: string): string {
    return `${userId}:${cacheDate}`;
  }

  async findForUserAndDate(userId: string, cacheDate: string): Promise<FeedCacheRecord | null> {
    return this.records.get(this.key(userId, cacheDate)) ?? null;
  }

  async upsertForUserAndDate(
    userId: string,
    cacheDate: string,
    input: FeedCacheInput,
  ): Promise<FeedCacheRecord> {
    const key = this.key(userId, cacheDate);
    const existing = this.records.get(key);
    const record: FeedCacheRecord = {
      id: existing?.id ?? randomUUID(),
      userId,
      cacheDate,
      preferencesHash: input.preferencesHash,
      content: input.content,
      generatedAt: new Date(),
    };

    this.records.set(key, record);

    return record;
  }
}
