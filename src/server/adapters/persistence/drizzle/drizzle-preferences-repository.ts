import { asc, eq, sql } from "drizzle-orm";

import type { Database } from "../../../db/client";
import { feedCache, preferences, users } from "../../../db/schema";
import { haveSameTopics } from "../../../modules/preferences/preferences-normalizer";
import type {
  PreferenceInput,
  PreferenceRecord,
  PreferencesRepository,
} from "../../../ports/preferences-repository";

export class DrizzlePreferencesRepository implements PreferencesRepository {
  constructor(private readonly db: Database) {}

  async listForUser(userId: string): Promise<PreferenceRecord[]> {
    return this.db
      .select({
        id: preferences.id,
        userId: preferences.userId,
        topic: preferences.topic,
        normalizedTopic: preferences.normalizedTopic,
        createdAt: preferences.createdAt,
      })
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .orderBy(asc(preferences.normalizedTopic));
  }

  async replaceForUser(userId: string, input: PreferenceInput[]): Promise<PreferenceRecord[]> {
    return this.db.transaction(async (transaction) => {
      // Uma linha estável por usuário serializa PUTs concorrentes.
      await transaction.execute(
        sql`select ${users.id} from ${users} where ${users.id} = ${userId} for update`,
      );

      const current = await transaction
        .select({
          id: preferences.id,
          userId: preferences.userId,
          topic: preferences.topic,
          normalizedTopic: preferences.normalizedTopic,
          createdAt: preferences.createdAt,
        })
        .from(preferences)
        .where(eq(preferences.userId, userId))
        .orderBy(asc(preferences.normalizedTopic));

      if (
        haveSameTopics(
          current.map((preference) => preference.normalizedTopic),
          input.map((preference) => preference.normalizedTopic),
        )
      ) {
        return current;
      }

      await transaction.delete(preferences).where(eq(preferences.userId, userId));

      let inserted: PreferenceRecord[] = [];

      if (input.length > 0) {
        inserted = await transaction
          .insert(preferences)
          .values(
            input.map((item) => ({
              userId,
              topic: item.topic,
              normalizedTopic: item.normalizedTopic,
            })),
          )
          .returning({
            id: preferences.id,
            userId: preferences.userId,
            topic: preferences.topic,
            normalizedTopic: preferences.normalizedTopic,
            createdAt: preferences.createdAt,
          });
      }

      await transaction.delete(feedCache).where(eq(feedCache.userId, userId));

      return inserted.sort((first, second) =>
        first.normalizedTopic < second.normalizedTopic ? -1 : 1,
      );
    });
  }
}
