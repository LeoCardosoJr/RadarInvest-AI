import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME } from "@/server/auth/session-cookie";
import { createDatabase } from "@/server/db/client";
import { passwordResetTokens, users } from "@/server/db/schema";
import { hashResetToken } from "@/server/modules/auth/auth-service";

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

const credentials = {
  name: "Maria Silva",
  email: "maria@example.com",
  password: "senha-segura-123",
};

function jsonRequest(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`https://radarinvest.local${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!runIntegrationTests)("authentication routes", () => {
  let connection: ReturnType<typeof createDatabase>;
  let routes: {
    register: (request: Request) => Promise<Response>;
    login: (request: Request) => Promise<Response>;
    logout: () => Promise<Response>;
    forgotPassword: (request: Request) => Promise<Response>;
    resetPassword: (request: Request) => Promise<Response>;
  };

  beforeAll(async () => {
    // O ambiente é definido antes do primeiro uso do composition root, que o lê
    // sob demanda. O SMTP fica ausente de propósito: o token nunca sai por log.
    process.env.JWT_SECRET ??= "a-secure-test-secret-with-at-least-32-characters";
    process.env.PASSWORD_HASH_COST = "10";
    process.env.PASSWORD_RESET_COOLDOWN_SECONDS = "0";
    process.env.APP_URL = "https://radarinvest.local";

    connection = createDatabase(databaseUrl!);

    routes = {
      register: (await import("./register/route")).POST,
      login: (await import("./login/route")).POST,
      logout: (await import("./logout/route")).POST,
      forgotPassword: (await import("./forgot-password/route")).POST,
      resetPassword: (await import("./reset-password/route")).POST,
    };
  });

  beforeEach(async () => {
    await connection.db.delete(users);
  });

  afterAll(async () => {
    await connection.client.end();
  });

  function sessionCookieFrom(response: Response): string | undefined {
    return response.headers.getSetCookie().find((cookie) => cookie.startsWith(SESSION_COOKIE_NAME));
  }

  async function registerUser() {
    const response = await routes.register(jsonRequest("/auth/register", credentials));
    const body = (await response.json()) as { accessToken: string; user: { id: string } };

    return { response, body };
  }

  describe("POST /auth/register", () => {
    it("creates the account, returns the token and sets the session cookie", async () => {
      const { response, body } = await registerUser();

      expect(response.status).toBe(201);
      expect(body.user).toMatchObject({ name: "Maria Silva", email: "maria@example.com" });
      expect(body.accessToken).toBeTypeOf("string");
      expect(JSON.stringify(body)).not.toContain("passwordHash");

      const cookie = sessionCookieFrom(response);
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=lax");
      expect(cookie).toContain("Path=/");
      // Fora de produção o cookie precisa funcionar em HTTP local.
      expect(cookie).not.toContain("Secure");
    });

    it("normalizes the e-mail before persisting", async () => {
      await routes.register(
        jsonRequest("/auth/register", { ...credentials, email: " Maria@Example.COM " }),
      );

      const [stored] = await connection.db.select().from(users);
      expect(stored?.email).toBe("maria@example.com");
    });

    it("answers 409 for a duplicated e-mail", async () => {
      await registerUser();

      const response = await routes.register(jsonRequest("/auth/register", credentials));
      const body = (await response.json()) as { error: { code: string } };

      expect(response.status).toBe(409);
      expect(body.error.code).toBe("ACCOUNT_ALREADY_EXISTS");
    });

    it("rejects a password beyond the bcrypt byte limit", async () => {
      const response = await routes.register(
        jsonRequest("/auth/register", { ...credentials, password: "a".repeat(73) }),
      );

      expect(response.status).toBe(400);
      expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
      expect(await connection.db.select().from(users)).toHaveLength(0);
    });
  });

  describe("POST /auth/login", () => {
    it("returns the token and the session cookie", async () => {
      await registerUser();

      const response = await routes.login(
        jsonRequest("/auth/login", { email: credentials.email, password: credentials.password }),
      );
      const body = (await response.json()) as { accessToken: string };

      expect(response.status).toBe(200);
      expect(body.accessToken).toBeTypeOf("string");
      expect(sessionCookieFrom(response)).toContain("HttpOnly");
      expect(JSON.stringify(body)).not.toContain("passwordHash");
    });

    it("answers identically for an unknown e-mail and a wrong password", async () => {
      await registerUser();

      const unknownEmail = await routes.login(
        jsonRequest("/auth/login", {
          email: "ninguem@example.com",
          password: credentials.password,
        }),
      );
      const wrongPassword = await routes.login(
        jsonRequest("/auth/login", { email: credentials.email, password: "senha-errada-123" }),
      );

      expect(unknownEmail.status).toBe(wrongPassword.status);
      expect(unknownEmail.status).toBe(401);
      expect(await unknownEmail.json()).toEqual(await wrongPassword.json());
    });
  });

  describe("POST /auth/logout", () => {
    it("clears the session cookie", async () => {
      const response = await routes.logout();
      const cookie = sessionCookieFrom(response);

      expect(response.status).toBe(204);
      expect(cookie).toContain("Max-Age=0");
      expect(cookie).toContain("HttpOnly");
    });
  });

  describe("POST /auth/forgot-password", () => {
    it("answers 202 with the same body whether or not the account exists", async () => {
      await registerUser();

      const existing = await routes.forgotPassword(
        jsonRequest("/auth/forgot-password", { email: credentials.email }),
      );
      const unknown = await routes.forgotPassword(
        jsonRequest("/auth/forgot-password", { email: "ninguem@example.com" }),
      );

      expect(existing.status).toBe(202);
      expect(unknown.status).toBe(202);
      expect(await existing.json()).toEqual(await unknown.json());
    });

    it("never returns or logs the generated token", async () => {
      const consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
        vi.spyOn(console, method).mockImplementation(() => undefined),
      );
      await registerUser();

      const response = await routes.forgotPassword(
        jsonRequest("/auth/forgot-password", { email: credentials.email }),
      );
      const payload = await response.text();

      const [stored] = await connection.db.select().from(passwordResetTokens);
      expect(stored?.tokenHash).toHaveLength(64);
      expect(payload).not.toContain(stored!.tokenHash);
      expect(payload.toLowerCase()).not.toContain("token");

      const logged = consoleSpies.flatMap((spy) => spy.mock.calls.flat()).join(" ");
      expect(logged).not.toContain(stored!.tokenHash);
      expect(logged).not.toContain(process.env.JWT_SECRET);
      expect(logged).not.toContain(credentials.password);

      for (const spy of consoleSpies) {
        spy.mockRestore();
      }
    });
  });

  describe("POST /auth/reset-password", () => {
    async function seedResetToken(userId: string, expiresAt: Date, usedAt: Date | null = null) {
      const token = "token-opaco-de-teste-com-entropia-suficiente";

      await connection.db.insert(passwordResetTokens).values({
        userId,
        tokenHash: hashResetToken(token),
        expiresAt,
        usedAt,
      });

      return token;
    }

    it("updates the password and signs the user in", async () => {
      const { body } = await registerUser();
      const token = await seedResetToken(body.user.id, new Date(Date.now() + 600_000));

      const response = await routes.resetPassword(
        jsonRequest("/auth/reset-password", { token, password: "nova-senha-segura" }),
      );
      const payload = (await response.json()) as { accessToken: string };

      expect(response.status).toBe(200);
      expect(sessionCookieFrom(response)).toContain("HttpOnly");
      expect(JSON.stringify(payload)).not.toContain("passwordHash");

      // Revogação do JWT anterior é coberta em auth.integration.test.ts.
      const login = await routes.login(
        jsonRequest("/auth/login", { email: credentials.email, password: "nova-senha-segura" }),
      );
      expect(login.status).toBe(200);
    });

    it("rejects a missing, unknown, used or expired token with the same public error", async () => {
      const { body } = await registerUser();
      const expiredToken = await seedResetToken(body.user.id, new Date(Date.now() - 1_000));
      await connection.db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, body.user.id));
      const usedToken = await seedResetToken(
        body.user.id,
        new Date(Date.now() + 600_000),
        new Date(),
      );

      const responses = await Promise.all([
        routes.resetPassword(
          jsonRequest("/auth/reset-password", { token: "", password: "nova-senha-segura" }),
        ),
        routes.resetPassword(
          jsonRequest("/auth/reset-password", {
            token: "token-inexistente",
            password: "nova-senha-segura",
          }),
        ),
        routes.resetPassword(
          jsonRequest("/auth/reset-password", {
            token: expiredToken,
            password: "nova-senha-segura",
          }),
        ),
        routes.resetPassword(
          jsonRequest("/auth/reset-password", { token: usedToken, password: "nova-senha-segura" }),
        ),
      ]);

      expect(responses.map((response) => response.status)).toEqual([400, 400, 400, 400]);

      // A senha original continua válida: nenhuma rejeição alterou o usuário.
      const login = await routes.login(
        jsonRequest("/auth/login", { email: credentials.email, password: credentials.password }),
      );
      expect(login.status).toBe(200);
    });
  });
});
