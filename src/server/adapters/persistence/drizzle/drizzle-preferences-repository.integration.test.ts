import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "../../../db/client";
import { feedCache, preferences, users } from "../../../db/schema";
import { DrizzlePreferencesRepository } from "./drizzle-preferences-repository";

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

describe.skipIf(!runIntegrationTests)("DrizzlePreferencesRepository against PostgreSQL", () => {
  let connection: ReturnType<typeof createDatabase>;
  let secondConnection: ReturnType<typeof createDatabase>;
  let repository: DrizzlePreferencesRepository;
  let secondRepository: DrizzlePreferencesRepository;

  beforeAll(() => {
    connection = createDatabase(databaseUrl!);
    secondConnection = createDatabase(databaseUrl!);
    repository = new DrizzlePreferencesRepository(connection.db);
    secondRepository = new DrizzlePreferencesRepository(secondConnection.db);
  });

  beforeEach(async () => {
    await connection.db.delete(users);
  });

  afterAll(async () => {
    await Promise.all([connection?.client.end(), secondConnection?.client.end()]);
  });

  async function createUser(email: string): Promise<string> {
    const [user] = await connection.db
      .insert(users)
      .values({
        name: "Test User",
        email,
        passwordHash: "$2a$10$dummyhashforexampleneverusedforlogin0000000000000000",
      })
      .returning({ id: users.id });

    return user!.id;
  }

  it("retorna lista vazia quando o usuário não possui preferências", async () => {
    const userId = await createUser("user1@example.com");
    const result = await repository.listForUser(userId);

    expect(result).toEqual([]);
  });

  it("insere e lista preferências em ordem cronológica", async () => {
    const userId = await createUser("user1@example.com");

    const inserted = await repository.replaceForUser(userId, [
      { topic: "PETR4", normalizedTopic: "petr4" },
      { topic: "VALE3", normalizedTopic: "vale3" },
    ]);

    expect(inserted).toHaveLength(2);

    const listed = await repository.listForUser(userId);
    expect(listed.map((item) => item.topic)).toEqual(["PETR4", "VALE3"]);
    expect(listed.map((item) => item.normalizedTopic)).toEqual(["petr4", "vale3"]);
  });

  it("substitui a coleção inteira e invalida o cache do feed atomicamente", async () => {
    const userId = await createUser("user1@example.com");

    // Popula preferências iniciais
    await repository.replaceForUser(userId, [{ topic: "PETR4", normalizedTopic: "petr4" }]);

    // Insere entrada no cache de feed
    await connection.db.insert(feedCache).values({
      userId,
      cacheDate: "2026-08-17",
      preferencesHash: "dummy-hash-123456",
      contentJson: { items: [] },
    });

    const cacheBefore = await connection.db
      .select()
      .from(feedCache)
      .where(eq(feedCache.userId, userId));
    expect(cacheBefore).toHaveLength(1);

    // Substitui coleção
    const replaced = await repository.replaceForUser(userId, [
      { topic: "VALE3", normalizedTopic: "vale3" },
      { topic: "Taxa Selic", normalizedTopic: "taxa selic" },
    ]);

    expect(replaced.map((item) => item.topic)).toEqual(["Taxa Selic", "VALE3"]);

    // Confirma que o cache foi invalidado (removido)
    const cacheAfter = await connection.db
      .select()
      .from(feedCache)
      .where(eq(feedCache.userId, userId));
    expect(cacheAfter).toHaveLength(0);
  });

  it("garante cascade de remoção de preferências e cache ao deletar o usuário", async () => {
    const userId = await createUser("user-cascade@example.com");

    await repository.replaceForUser(userId, [{ topic: "PETR4", normalizedTopic: "petr4" }]);
    await connection.db.insert(feedCache).values({
      userId,
      cacheDate: "2026-08-17",
      preferencesHash: "dummy-hash",
      contentJson: { items: [] },
    });

    // Remove o usuário
    await connection.db.delete(users).where(eq(users.id, userId));

    const remainingPreferences = await connection.db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, userId));
    const remainingCache = await connection.db
      .select()
      .from(feedCache)
      .where(eq(feedCache.userId, userId));

    expect(remainingPreferences).toHaveLength(0);
    expect(remainingCache).toHaveLength(0);
  });

  it("garante isolamento estrito entre usuários distintos no banco", async () => {
    const user1 = await createUser("user1@example.com");
    const user2 = await createUser("user2@example.com");

    await repository.replaceForUser(user1, [{ topic: "PETR4", normalizedTopic: "petr4" }]);
    await repository.replaceForUser(user2, [{ topic: "BBAS3", normalizedTopic: "bbas3" }]);

    // Cria cache para ambos
    await connection.db.insert(feedCache).values([
      {
        userId: user1,
        cacheDate: "2026-08-17",
        preferencesHash: "hash-user1",
        contentJson: { user: 1 },
      },
      {
        userId: user2,
        cacheDate: "2026-08-17",
        preferencesHash: "hash-user2",
        contentJson: { user: 2 },
      },
    ]);

    // Atualiza preferências de user1
    await repository.replaceForUser(user1, [{ topic: "VALE3", normalizedTopic: "vale3" }]);

    // Preferências e cache de user2 continuam intactos
    const user2Preferences = await repository.listForUser(user2);
    expect(user2Preferences.map((p) => p.topic)).toEqual(["BBAS3"]);

    const user2Cache = await connection.db
      .select()
      .from(feedCache)
      .where(eq(feedCache.userId, user2));
    expect(user2Cache).toHaveLength(1);
    expect(user2Cache[0]?.preferencesHash).toBe("hash-user2");
  });

  it("serializa substituições concorrentes do mesmo usuário", async () => {
    const userId = await createUser("user-concurrent@example.com");

    await Promise.all([
      repository.replaceForUser(userId, [
        { topic: "PETR4", normalizedTopic: "petr4" },
        { topic: "VALE3", normalizedTopic: "vale3" },
      ]),
      secondRepository.replaceForUser(userId, [
        { topic: "BBDC4", normalizedTopic: "bbdc4" },
        { topic: "ITUB4", normalizedTopic: "itub4" },
      ]),
    ]);

    const storedTopics = (await repository.listForUser(userId)).map(
      (preference) => preference.normalizedTopic,
    );

    expect([
      ["petr4", "vale3"],
      ["bbdc4", "itub4"],
    ]).toContainEqual(storedTopics);
  });
});
