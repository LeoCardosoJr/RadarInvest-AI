import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { JoseJwtService } from "@/server/adapters/security/jose-jwt-service";
import { createDatabase } from "@/server/db/client";
import { feedCache, users } from "@/server/db/schema";
import type { PreferencesResponseBody } from "./route";

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

function jsonRequest(method: "GET" | "PUT", path: string, body?: unknown, token?: string): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return new Request(`https://radarinvest.local${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe.skipIf(!runIntegrationTests)("preferences routes", () => {
  let connection: ReturnType<typeof createDatabase>;
  let jwtService: JoseJwtService;
  let routes: {
    GET: (request: Request) => Promise<Response>;
    PUT: (request: Request) => Promise<Response>;
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = testJwtSecret;
    process.env.JWT_ISSUER = "radarinvest-ai";
    process.env.JWT_AUDIENCE = "radarinvest-web";
    process.env.APP_URL = "https://radarinvest.local";

    connection = createDatabase(databaseUrl!);
    jwtService = new JoseJwtService({
      secret: testJwtSecret,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      expiresInSeconds: 3_600,
    });

    routes = {
      GET: (await import("./route")).GET,
      PUT: (await import("./route")).PUT,
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

    const session = await jwtService.issueAccessToken({
      userId: user!.id,
      tokenVersion: 0,
    });

    return { id: user!.id, token: session.accessToken };
  }

  describe("GET /preferences", () => {
    it("retorna 401 UNAUTHORIZED quando a requisição não contém token", async () => {
      const request = jsonRequest("GET", "/preferences");
      const response = await routes.GET(request);
      const payload = (await response.json()) as { error: { code: string } };

      expect(response.status).toBe(401);
      expect(payload.error.code).toBe("UNAUTHORIZED");
    });

    it("retorna 200 com lista vazia para usuário recém-criado", async () => {
      const user = await createUser("user-empty@example.com");
      const request = jsonRequest("GET", "/preferences", undefined, user.token);
      const response = await routes.GET(request);
      const payload = (await response.json()) as PreferencesResponseBody;

      expect(response.status).toBe(200);
      expect(payload.interests).toEqual([]);
    });

    it("retorna 200 com os interesses cadastrados", async () => {
      const user = await createUser("user-list@example.com");

      // Cadastra interesses via PUT
      await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: ["PETR4", "VALE3"] }, user.token),
      );

      const request = jsonRequest("GET", "/preferences", undefined, user.token);
      const response = await routes.GET(request);
      const payload = (await response.json()) as PreferencesResponseBody;

      expect(response.status).toBe(200);
      expect(payload.interests).toHaveLength(2);
      expect(payload.interests.map((i) => i.topic)).toEqual(["PETR4", "VALE3"]);
      expect(payload.interests[0]?.createdAt).toBeDefined();
    });
  });

  describe("PUT /preferences", () => {
    it("retorna 401 UNAUTHORIZED quando a requisição não contém token", async () => {
      const request = jsonRequest("PUT", "/preferences", { topics: ["PETR4"] });
      const response = await routes.PUT(request);
      const payload = (await response.json()) as { error: { code: string } };

      expect(response.status).toBe(401);
      expect(payload.error.code).toBe("UNAUTHORIZED");
    });

    it("retorna 400 VALIDATION_ERROR quando o payload é inválido", async () => {
      const user = await createUser("user-val@example.com");

      // Topics não é array
      const res1 = await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: "PETR4" }, user.token),
      );
      expect(res1.status).toBe(400);

      // Tópico com mais de 80 caracteres
      const res2 = await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: ["A".repeat(81)] }, user.token),
      );
      expect(res2.status).toBe(400);

      // Tópico vazio
      const res3 = await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: ["   "] }, user.token),
      );
      expect(res3.status).toBe(400);

      // Mais de 20 tópicos
      const res4 = await routes.PUT(
        jsonRequest(
          "PUT",
          "/preferences",
          { topics: Array.from({ length: 21 }, (_, i) => `Tópico ${i + 1}`) },
          user.token,
        ),
      );
      expect(res4.status).toBe(400);
    });

    it("atualiza interesses e substitui a coleção inteira", async () => {
      const user = await createUser("user-update@example.com");

      // Primeiro PUT
      const res1 = await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: ["PETR4", "VALE3"] }, user.token),
      );
      const payload1 = (await res1.json()) as PreferencesResponseBody;
      expect(res1.status).toBe(200);
      expect(payload1.interests.map((i) => i.topic)).toEqual(["PETR4", "VALE3"]);

      // Segundo PUT com nova lista
      const res2 = await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: ["ITUB4", "BBDC4", "BBAS3"] }, user.token),
      );
      const payload2 = (await res2.json()) as PreferencesResponseBody;
      expect(res2.status).toBe(200);
      expect(payload2.interests.map((interest) => interest.topic)).toEqual([
        "BBAS3",
        "BBDC4",
        "ITUB4",
      ]);
    });

    it("é idempotente e preserva IDs existentes quando os interesses são equivalentes", async () => {
      const user = await createUser("user-idemp@example.com");

      const res1 = await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: ["PETR4", "VALE3"] }, user.token),
      );
      const payload1 = (await res1.json()) as PreferencesResponseBody;

      // PUT com mesma lista em ordem diferente e variação de caixa
      const res2 = await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: ["vale3", "  petr4  "] }, user.token),
      );
      const payload2 = (await res2.json()) as PreferencesResponseBody;

      expect(res2.status).toBe(200);
      // Os IDs e timestamps preservam o registro original
      expect(payload2.interests.map((i) => i.id).sort()).toEqual(
        payload1.interests.map((i) => i.id).sort(),
      );
    });

    it("normaliza espaços antes de aplicar o limite do tópico", async () => {
      const user = await createUser("user-normalization@example.com");
      const repeatedTopic = `PETR4${" ".repeat(100)}ações`;

      const response = await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: [repeatedTopic] }, user.token),
      );
      const payload = (await response.json()) as PreferencesResponseBody;

      expect(response.status).toBe(200);
      expect(payload.interests.map((interest) => interest.topic)).toEqual(["PETR4 ações"]);
    });

    it("invalida o cache de feed quando há alteração efetiva de interesses", async () => {
      const user = await createUser("user-cache@example.com");

      // Cria preferências iniciais
      await routes.PUT(jsonRequest("PUT", "/preferences", { topics: ["PETR4"] }, user.token));

      // Simula cache de feed gravado
      await connection.db.insert(feedCache).values({
        userId: user.id,
        cacheDate: "2026-08-17",
        preferencesHash: "old-hash",
        contentJson: { items: [] },
      });

      // Atualiza com novo interesse
      await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: ["PETR4", "VALE3"] }, user.token),
      );

      // Cache do feed deve ter sido removido
      const remainingCache = await connection.db
        .select()
        .from(feedCache)
        .where(eq(feedCache.userId, user.id));
      expect(remainingCache).toHaveLength(0);
    });

    it("garante isolamento estrito entre usuários distintos", async () => {
      const user1 = await createUser("user-iso-1@example.com");
      const user2 = await createUser("user-iso-2@example.com");

      await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: ["PETR4", "VALE3"] }, user1.token),
      );
      await routes.PUT(
        jsonRequest("PUT", "/preferences", { topics: ["ITUB4", "BBDC4"] }, user2.token),
      );

      const resUser1 = await routes.GET(jsonRequest("GET", "/preferences", undefined, user1.token));
      const resUser2 = await routes.GET(jsonRequest("GET", "/preferences", undefined, user2.token));

      const payload1 = (await resUser1.json()) as PreferencesResponseBody;
      const payload2 = (await resUser2.json()) as PreferencesResponseBody;

      expect(payload1.interests.map((i) => i.topic)).toEqual(["PETR4", "VALE3"]);
      expect(payload2.interests.map((interest) => interest.topic)).toEqual(["BBDC4", "ITUB4"]);
    });
  });
});
