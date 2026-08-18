import { and, eq } from "drizzle-orm";

import type { Database } from "../../../db/client";
import { feedCache } from "../../../db/schema";
import type {
  FeedCacheInput,
  FeedCacheRecord,
  FeedCacheRepository,
  FeedContent,
} from "../../../ports/feed-cache-repository";

function toRecord(row: typeof feedCache.$inferSelect): FeedCacheRecord {
  return {
    id: row.id,
    userId: row.userId,
    cacheDate: row.cacheDate,
    preferencesHash: row.preferencesHash,
    content: row.contentJson as FeedContent,
    generatedAt: row.generatedAt,
  };
}

export class DrizzleFeedCacheRepository implements FeedCacheRepository {
  constructor(private readonly db: Database) {}

  async findForUserAndDate(userId: string, cacheDate: string): Promise<FeedCacheRecord | null> {
    const [row] = await this.db
      .select()
      .from(feedCache)
      .where(and(eq(feedCache.userId, userId), eq(feedCache.cacheDate, cacheDate)));

    return row ? toRecord(row) : null;
  }

  async upsertForUserAndDate(
    userId: string,
    cacheDate: string,
    input: FeedCacheInput,
  ): Promise<FeedCacheRecord> {
    const [row] = await this.db
      .insert(feedCache)
      .values({
        userId,
        cacheDate,
        preferencesHash: input.preferencesHash,
        contentJson: input.content,
      })
      .onConflictDoUpdate({
        target: [feedCache.userId, feedCache.cacheDate],
        set: {
          preferencesHash: input.preferencesHash,
          contentJson: input.content,
          generatedAt: new Date(),
        },
      })
      .returning();

    return toRecord(row!);
  }
}
