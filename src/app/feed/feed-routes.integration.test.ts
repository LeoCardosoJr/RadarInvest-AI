import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { JoseJwtService } from "@/server/adapters/security/jose-jwt-service";
import { createDatabase } from "@/server/db/client";
import { feedCache, preferences, users } from "@/server/db/schema";
import { currentCacheDate } from "@/server/modules/feed/feed-date";
import { computePreferencesHash } from "@/server/modules/preferences/preferences-normalizer";
import type { FeedResponseBody } from "./route";

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
const testJwtSecret = "a-secure-test-secret-with-at-least-32-characters";

function jsonRequest(method: "GET" | "POST", path: string, token?: string): Request {
  const headers: Record<string, string> = {};

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return new Request(`https://radarinvest.local${path}`, { method, headers });
}

// Cobre apenas os caminhos que não dependem de chamadas reais ao Gemini/InfoMoney:
// autenticação, estado vazio (sem preferências) e cache lido diretamente do banco.
// A geração em si é coberta por unidade em feed-service.test.ts com providers fake.
describe.skipIf(!runIntegrationTests)("feed routes", () => {
  let connection: ReturnType<typeof createDatabase>;
  let jwtService: JoseJwtService;
  let routes: {
    GET: (request: Request) => Promise<Response>;
    refresh: (request: Request) => Promise<Response>;
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = testJwtSecret;
    process.env.JWT_ISSUER = "radarinvest-ai";
    process.env.JWT_AUDIENCE = "radarinvest-web";
    process.env.APP_URL = "https://radarinvest.local";
    process.env.FEED_TIMEZONE = "America/Sao_Paulo";
    process.env.FEED_REFRESH_COOLDOWN_SECONDS = "60";

    connection = createDatabase(databaseUrl!);
    jwtService = new JoseJwtService({
      secret: testJwtSecret,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      expiresInSeconds: 3_600,
    });

    routes = {
      GET: (await import("./route")).GET,
      refresh: (await import("./refresh/route")).POST,
    };
  });

  beforeEach(async () => {
    await connection.db.delete(users);
  });

  afterAll(async () => {
    await connection?.client.end();
  });

  async function createUser(email: string): Promise<{ id: string; token: string }> {
    const [user] = await connection.db
      .insert(users)
      .values({
        name: "Test User",
        email,
        passwordHash: "$2a$10$dummyhashforexampleneverusedforlogin0000000000000000",
      })
      .returning({ id: users.id });

    const session = await jwtService.issueAccessToken({ userId: user!.id, tokenVersion: 0 });

    return { id: user!.id, token: session.accessToken };
  }

  describe("GET /feed", () => {
    it("retorna 401 UNAUTHORIZED sem token", async () => {
      const response = await routes.GET(jsonRequest("GET", "/feed"));
      const payload = (await response.json()) as { error: { code: string } };

      expect(response.status).toBe(401);
      expect(payload.error.code).toBe("UNAUTHORIZED");
    });

    it("retorna 200 com estado vazio quando o usuário não tem preferências", async () => {
      const user = await createUser("user-empty@example.com");
      const response = await routes.GET(jsonRequest("GET", "/feed", user.token));
      const payload = (await response.json()) as FeedResponseBody;

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        generatedAt: null,
        interests: [],
        items: [],
        cached: false,
        stale: false,
      });
      expect(payload.message).toBeTruthy();
    });

    it("retorna o cache do dia quando o hash de preferências é compatível", async () => {
      const user = await createUser("user-cache@example.com");
      await connection.db
        .insert(preferences)
        .values({ userId: user.id, topic: "PETR4", normalizedTopic: "petr4" });

      const cacheDate = currentCacheDate("America/Sao_Paulo");
      const hash = computePreferencesHash(["petr4"]);
      await connection.db.insert(feedCache).values({
        userId: user.id,
        cacheDate,
        preferencesHash: hash,
        contentJson: {
          interests: ["PETR4"],
          items: [{ title: "T", source: "InfoMoney", url: "https://x", summary: "Resumo." }],
        },
      });

      const response = await routes.GET(jsonRequest("GET", "/feed", user.token));
      const payload = (await response.json()) as FeedResponseBody;

      expect(response.status).toBe(200);
      expect(payload.cached).toBe(true);
      expect(payload.stale).toBe(false);
      expect(payload.items).toHaveLength(1);
    });
  });

  describe("POST /feed/refresh", () => {
    it("retorna 401 UNAUTHORIZED sem token", async () => {
      const response = await routes.refresh(jsonRequest("POST", "/feed/refresh"));
      const payload = (await response.json()) as { error: { code: string } };

      expect(response.status).toBe(401);
      expect(payload.error.code).toBe("UNAUTHORIZED");
    });

    it("retorna 200 com estado vazio quando o usuário não tem preferências, sem checar cooldown", async () => {
      const user = await createUser("user-empty@example.com");
      const response = await routes.refresh(jsonRequest("POST", "/feed/refresh", user.token));
      const payload = (await response.json()) as FeedResponseBody;

      expect(response.status).toBe(200);
      expect(payload.generatedAt).toBeNull();
    });

    it("retorna 429 FEED_REFRESH_COOLDOWN quando o cache de hoje foi gerado há pouco", async () => {
      const user = await createUser("user-cooldown@example.com");
      await connection.db
        .insert(preferences)
        .values({ userId: user.id, topic: "PETR4", normalizedTopic: "petr4" });

      const cacheDate = currentCacheDate("America/Sao_Paulo");
      const hash = computePreferencesHash(["petr4"]);
      await connection.db.insert(feedCache).values({
        userId: user.id,
        cacheDate,
        preferencesHash: hash,
        contentJson: { interests: ["PETR4"], items: [] },
      });

      const response = await routes.refresh(jsonRequest("POST", "/feed/refresh", user.token));
      const payload = (await response.json()) as {
        error: { code: string; details?: { retryAfterSeconds?: string } };
      };

      expect(response.status).toBe(429);
      expect(payload.error.code).toBe("FEED_REFRESH_COOLDOWN");
      expect(Number(payload.error.details?.retryAfterSeconds)).toBeGreaterThan(0);
    });
  });
});
