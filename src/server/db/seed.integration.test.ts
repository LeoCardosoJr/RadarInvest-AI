import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { parseSeedEnv, type SeedEnv } from "../env-schema";
import { createDatabase } from "./client";
import { feedCache, preferences, users } from "./schema";
import { seedDatabase } from "./seed-service";

function isSafeTestDatabase(databaseUrl: string | undefined): databaseUrl is string {
  if (!databaseUrl) {
    return false;
  }

  try {
    return new URL(databaseUrl).pathname.endsWith("_test");
  } catch {
    return false;
  }
}

const databaseUrl = process.env.DATABASE_URL;
const runIntegrationTests = isSafeTestDatabase(databaseUrl);

describe.skipIf(!runIntegrationTests)("database migration and seed integration", () => {
  let connection: ReturnType<typeof createDatabase>;
  let env: SeedEnv;

  beforeAll(() => {
    connection = createDatabase(databaseUrl!);
    env = parseSeedEnv({
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      PASSWORD_HASH_COST: "10",
      SEED_ENABLED: "true",
      SEED_USER_NAME: "Usuário Demo",
      SEED_USER_EMAIL: " Demo@RadarInvest.Local ",
      SEED_USER_PASSWORD: "Demo@123456",
      SEED_USER_INTERESTS: "PETR4, petr4, VALE3, taxa   Selic",
    });
  });

  beforeEach(async () => {
    await connection.db.delete(feedCache);
    await connection.db.delete(preferences);
    await connection.db.delete(users);
  });

  afterAll(async () => {
    await connection.client.end();
  });

  const dependencies = () => ({
    db: connection.db,
    hashPassword: hash,
    logger: { info: () => undefined },
  });

  it("creates one normalized user and unique demo interests", async () => {
    await seedDatabase(env, dependencies());
    await seedDatabase(env, dependencies());

    const persistedUsers = await connection.db.select().from(users);
    const persistedPreferences = await connection.db.select().from(preferences);

    expect(persistedUsers).toHaveLength(1);
    expect(persistedUsers[0]).toMatchObject({
      name: "Usuário Demo",
      email: "demo@radarinvest.local",
    });
    expect(persistedUsers[0]?.passwordHash).not.toBe(env.SEED_USER_PASSWORD);
    expect(persistedPreferences).toHaveLength(3);
    expect(persistedPreferences.map(({ normalizedTopic }) => normalizedTopic).sort()).toEqual([
      "petr4",
      "taxa selic",
      "vale3",
    ]);
  });

  it("does not overwrite an existing user", async () => {
    await seedDatabase(env, dependencies());

    await connection.db
      .update(users)
      .set({ name: "Nome preservado", passwordHash: "hash-preservado" })
      .where(eq(users.email, "demo@radarinvest.local"));

    await seedDatabase(env, dependencies());

    const [persistedUser] = await connection.db.select().from(users);
    expect(persistedUser).toMatchObject({
      name: "Nome preservado",
      passwordHash: "hash-preservado",
    });
  });

  it("uses database constraints to remain idempotent under concurrency", async () => {
    await Promise.all([seedDatabase(env, dependencies()), seedDatabase(env, dependencies())]);

    expect(await connection.db.select().from(users)).toHaveLength(1);
    expect(await connection.db.select().from(preferences)).toHaveLength(3);
  });

  it("validates interests before creating the user", async () => {
    await expect(
      seedDatabase(
        {
          ...env,
          SEED_USER_INTERESTS: "a".repeat(81),
        },
        dependencies(),
      ),
    ).rejects.toThrow(/at most 80 characters/);

    expect(await connection.db.select().from(users)).toHaveLength(0);
  });

  it("cascades preferences and feed cache when the user is deleted", async () => {
    await seedDatabase(env, dependencies());
    const [seedUser] = await connection.db.select({ id: users.id }).from(users);

    await connection.db.insert(feedCache).values({
      userId: seedUser!.id,
      cacheDate: "2026-08-15",
      preferencesHash: "a".repeat(64),
      contentJson: { items: [] },
    });
    await connection.db.delete(users).where(eq(users.id, seedUser!.id));

    expect(await connection.db.select().from(preferences)).toHaveLength(0);
    expect(await connection.db.select().from(feedCache)).toHaveLength(0);
  });
});
