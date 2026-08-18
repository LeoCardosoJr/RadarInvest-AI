import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "../../../db/client";
import { feedCache, users } from "../../../db/schema";
import type { FeedContent } from "../../../ports/feed-cache-repository";
import { DrizzleFeedCacheRepository } from "./drizzle-feed-cache-repository";

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

describe.skipIf(!runIntegrationTests)("DrizzleFeedCacheRepository against PostgreSQL", () => {
  let connection: ReturnType<typeof createDatabase>;
  let repository: DrizzleFeedCacheRepository;

  const content: FeedContent = {
    interests: ["PETR4"],
    items: [{ title: "Título", source: "InfoMoney", url: "https://x", summary: "Resumo." }],
  };

  beforeAll(() => {
    connection = createDatabase(databaseUrl!);
    repository = new DrizzleFeedCacheRepository(connection.db);
  });

  beforeEach(async () => {
    await connection.db.delete(users);
  });

  afterAll(async () => {
    await connection?.client.end();
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

  it("retorna null quando não há cache para o usuário e a data", async () => {
    const userId = await createUser("user1@example.com");

    const result = await repository.findForUserAndDate(userId, "2026-08-17");

    expect(result).toBeNull();
  });

  it("cria e depois encontra o cache do dia", async () => {
    const userId = await createUser("user1@example.com");

    const saved = await repository.upsertForUserAndDate(userId, "2026-08-17", {
      preferencesHash: "hash-1",
      content,
    });

    expect(saved.preferencesHash).toBe("hash-1");
    expect(saved.content).toEqual(content);

    const found = await repository.findForUserAndDate(userId, "2026-08-17");
    expect(found).toEqual(saved);
  });

  it("sobrescreve o cache existente do mesmo dia em vez de duplicar", async () => {
    const userId = await createUser("user1@example.com");

    await repository.upsertForUserAndDate(userId, "2026-08-17", {
      preferencesHash: "hash-1",
      content,
    });

    const updatedContent: FeedContent = { interests: ["PETR4", "VALE3"], items: [] };
    const updated = await repository.upsertForUserAndDate(userId, "2026-08-17", {
      preferencesHash: "hash-2",
      content: updatedContent,
    });

    expect(updated.preferencesHash).toBe("hash-2");
    expect(updated.content).toEqual(updatedContent);

    const rows = await connection.db.select().from(feedCache).where(eq(feedCache.userId, userId));
    expect(rows).toHaveLength(1);
  });

  it("isola o cache por usuário mesmo na mesma data", async () => {
    const user1 = await createUser("user1@example.com");
    const user2 = await createUser("user2@example.com");

    await repository.upsertForUserAndDate(user1, "2026-08-17", {
      preferencesHash: "hash-user1",
      content,
    });
    await repository.upsertForUserAndDate(user2, "2026-08-17", {
      preferencesHash: "hash-user2",
      content,
    });

    const user1Cache = await repository.findForUserAndDate(user1, "2026-08-17");
    const user2Cache = await repository.findForUserAndDate(user2, "2026-08-17");

    expect(user1Cache?.preferencesHash).toBe("hash-user1");
    expect(user2Cache?.preferencesHash).toBe("hash-user2");
  });

  it("remove o cache em cascata quando o usuário é excluído", async () => {
    const userId = await createUser("user-cascade@example.com");

    await repository.upsertForUserAndDate(userId, "2026-08-17", {
      preferencesHash: "hash-1",
      content,
    });

    await connection.db.delete(users).where(eq(users.id, userId));

    const remaining = await connection.db
      .select()
      .from(feedCache)
      .where(eq(feedCache.userId, userId));
    expect(remaining).toHaveLength(0);
  });
});
