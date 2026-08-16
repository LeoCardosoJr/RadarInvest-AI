import { eq } from "drizzle-orm";

import type { SeedEnv } from "../env-schema";
import type { Database } from "./client";
import { preferences, users } from "./schema";

const MAX_SEED_INTERESTS = 20;
const MAX_TOPIC_LENGTH = 80;

export interface SeedLogger {
  info(message: string): void;
}

export interface SeedDependencies {
  db: Database;
  hashPassword(password: string, cost: number): Promise<string>;
  logger: SeedLogger;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeTopic(topic: string): string {
  return topic.trim().replace(/\s+/g, " ").toLowerCase();
}

export function parseSeedInterests(source: string): Array<{
  topic: string;
  normalizedTopic: string;
}> {
  const uniqueTopics = new Map<string, string>();

  for (const rawTopic of source.split(",")) {
    const topic = rawTopic.trim().replace(/\s+/g, " ");

    if (!topic) {
      continue;
    }

    if (topic.length > MAX_TOPIC_LENGTH) {
      throw new Error(`Seed interests must have at most ${MAX_TOPIC_LENGTH} characters.`);
    }

    const normalizedTopic = normalizeTopic(topic);
    uniqueTopics.set(normalizedTopic, uniqueTopics.get(normalizedTopic) ?? topic);
  }

  if (uniqueTopics.size > MAX_SEED_INTERESTS) {
    throw new Error(`Seed must contain at most ${MAX_SEED_INTERESTS} interests.`);
  }

  return [...uniqueTopics].map(([normalizedTopic, topic]) => ({
    topic,
    normalizedTopic,
  }));
}

export async function seedDatabase(env: SeedEnv, dependencies: SeedDependencies): Promise<void> {
  if (!env.SEED_ENABLED) {
    dependencies.logger.info("Seed disabled; nothing to do.");
    return;
  }

  if (!env.SEED_USER_PASSWORD) {
    throw new Error("Seed password is required when the seed is enabled.");
  }

  const seedInterests = parseSeedInterests(env.SEED_USER_INTERESTS);
  const email = normalizeEmail(env.SEED_USER_EMAIL);
  const [existingUser] = await dependencies.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    dependencies.logger.info("Seed user already exists; existing data was preserved.");
    return;
  }

  const passwordHash = await dependencies.hashPassword(
    env.SEED_USER_PASSWORD,
    env.PASSWORD_HASH_COST,
  );
  const created = await dependencies.db.transaction(async (transaction) => {
    const [createdUser] = await transaction
      .insert(users)
      .values({
        name: env.SEED_USER_NAME,
        email,
        passwordHash,
      })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });

    if (!createdUser) {
      return false;
    }

    if (seedInterests.length > 0) {
      await transaction
        .insert(preferences)
        .values(
          seedInterests.map((interest) => ({
            userId: createdUser.id,
            ...interest,
          })),
        )
        .onConflictDoNothing({
          target: [preferences.userId, preferences.normalizedTopic],
        });
    }

    return true;
  });

  if (!created) {
    dependencies.logger.info("Seed user was created concurrently; existing data was preserved.");
    return;
  }

  dependencies.logger.info("Seed user and interests created successfully.");
}
