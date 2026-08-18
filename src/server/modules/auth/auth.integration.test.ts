import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DrizzlePasswordResetTokenRepository } from "../../adapters/persistence/drizzle/drizzle-password-reset-token-repository";
import { DrizzleUserRepository } from "../../adapters/persistence/drizzle/drizzle-user-repository";
import { BcryptjsPasswordHasher } from "../../adapters/security/bcryptjs-password-hasher";
import { JoseJwtService } from "../../adapters/security/jose-jwt-service";
import { authenticateRequest } from "../../auth/authenticate-request";
import { createDatabase } from "../../db/client";
import { passwordResetTokens, users } from "../../db/schema";
import {
  AccountAlreadyExistsError,
  InvalidCredentialsError,
  InvalidPasswordResetTokenError,
} from "../../errors/app-error";
import { FakePasswordResetNotifier } from "../../testing/auth-fakes";
import { AuthService, hashResetToken } from "./auth-service";

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

const jwtService = new JoseJwtService({
  secret: "a-secure-test-secret-with-at-least-32-characters",
  issuer: "radarinvest-ai",
  audience: "radarinvest-web",
  expiresInSeconds: 3_600,
});

const registerInput = {
  name: "Maria Silva",
  email: "maria@example.com",
  password: "senha-segura-123",
};

describe.skipIf(!runIntegrationTests)("authentication against PostgreSQL", () => {
  let primary: ReturnType<typeof createDatabase>;
  let secondary: ReturnType<typeof createDatabase>;

  beforeAll(() => {
    primary = createDatabase(databaseUrl!);
    // Conexão independente para exercitar concorrência real, e não a
    // serialização de um único cliente.
    secondary = createDatabase(databaseUrl!);
  });

  beforeEach(async () => {
    await primary.db.delete(users);
  });

  afterAll(async () => {
    await Promise.all([primary.client.end(), secondary.client.end()]);
  });

  function createService(connection = primary, now?: () => Date) {
    const userRepository = new DrizzleUserRepository(connection.db);
    const passwordResetTokenRepository = new DrizzlePasswordResetTokenRepository(connection.db);
    const passwordResetNotifier = new FakePasswordResetNotifier();

    const authService = new AuthService({
      userRepository,
      passwordResetTokenRepository,
      passwordHasher: new BcryptjsPasswordHasher(10),
      jwtService,
      passwordResetNotifier,
      logger: { error: vi.fn() },
      config: { passwordResetTokenTtlMinutes: 30, passwordResetCooldownSeconds: 60 },
      now,
    });

    return { authService, userRepository, passwordResetTokenRepository, passwordResetNotifier };
  }

  async function registerAndRequestReset() {
    const context = createService();
    const session = await context.authService.register(registerInput);
    await context.authService.requestPasswordReset({ email: registerInput.email });

    return { ...context, session, token: context.passwordResetNotifier.notifications[0]!.token };
  }

  describe("registration", () => {
    it("persists the normalized e-mail and a hash different from the password", async () => {
      const { authService } = createService();

      await authService.register({ ...registerInput, email: "Maria@Example.COM ".trim() });

      const [stored] = await primary.db.select().from(users);
      expect(stored?.email).toBe("maria@example.com");
      expect(stored?.passwordHash).not.toBe(registerInput.password);
      expect(stored?.tokenVersion).toBe(0);
    });

    it("rejects a duplicated account", async () => {
      const { authService } = createService();
      await authService.register(registerInput);

      await expect(authService.register(registerInput)).rejects.toBeInstanceOf(
        AccountAlreadyExistsError,
      );
      expect(await primary.db.select().from(users)).toHaveLength(1);
    });

    it("lets the unique constraint resolve concurrent registrations", async () => {
      const first = createService(primary).authService;
      const second = createService(secondary).authService;

      const results = await Promise.allSettled([
        first.register(registerInput),
        second.register(registerInput),
      ]);

      const fulfilled = results.filter((result) => result.status === "fulfilled");
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        AccountAlreadyExistsError,
      );
      expect(await primary.db.select().from(users)).toHaveLength(1);
    });
  });

  describe("login", () => {
    it("authenticates the registered user", async () => {
      const { authService } = createService();
      const registered = await authService.register(registerInput);

      const session = await authService.login({
        email: registerInput.email,
        password: registerInput.password,
      });

      expect(session.user.id).toBe(registered.user.id);
      expect(await jwtService.verifyAccessToken(session.accessToken)).toEqual({
        userId: registered.user.id,
        tokenVersion: 0,
      });
    });

    it("returns the same public failure for an unknown e-mail and a wrong password", async () => {
      const { authService } = createService();
      await authService.register(registerInput);

      const unknownEmail = (await authService
        .login({ email: "ninguem@example.com", password: registerInput.password })
        .catch((error: unknown) => error)) as InvalidCredentialsError;
      const wrongPassword = (await authService
        .login({ email: registerInput.email, password: "senha-errada-123" })
        .catch((error: unknown) => error)) as InvalidCredentialsError;

      expect([unknownEmail.status, unknownEmail.code, unknownEmail.message]).toEqual([
        wrongPassword.status,
        wrongPassword.code,
        wrongPassword.message,
      ]);
    });
  });

  describe("repository projections", () => {
    it("exposes the password hash only through the authentication lookup", async () => {
      const { authService, userRepository } = createService();
      const registered = await authService.register(registerInput);

      const publicUser = await userRepository.findPublicById(registered.user.id);
      const credentials = await userRepository.findCredentialsByEmail(registerInput.email);

      expect(publicUser).not.toHaveProperty("passwordHash");
      expect(credentials?.passwordHash).toBeTypeOf("string");
    });
  });

  describe("password reset", () => {
    it("persists only the SHA-256 hash of the token", async () => {
      const { token } = await registerAndRequestReset();

      const [stored] = await primary.db.select().from(passwordResetTokens);

      expect(stored?.tokenHash).toBe(hashResetToken(token));
      expect(stored?.tokenHash).not.toBe(token);
      expect(stored?.usedAt).toBeNull();
    });

    it("invalidates the previous request when a new token is issued", async () => {
      const clock = { value: new Date() };
      const context = createService(primary, () => clock.value);
      await context.authService.register(registerInput);

      await context.authService.requestPasswordReset({ email: registerInput.email });
      clock.value = new Date(clock.value.getTime() + 120_000);
      await context.authService.requestPasswordReset({ email: registerInput.email });

      const stored = await primary.db.select().from(passwordResetTokens);
      expect(stored).toHaveLength(2);
      expect(stored.filter((token) => token.usedAt === null)).toHaveLength(1);
    });

    it("honours the persisted cooldown across independent service instances", async () => {
      const first = createService(primary);
      await first.authService.register(registerInput);
      await first.authService.requestPasswordReset({ email: registerInput.email });

      // Uma segunda instância, como aconteceria em outra invocação serverless.
      const second = createService(secondary);
      await second.authService.requestPasswordReset({ email: registerInput.email });

      expect(second.passwordResetNotifier.notifications).toHaveLength(0);
      expect(await primary.db.select().from(passwordResetTokens)).toHaveLength(1);
    });

    it("updates the password, bumps the session version and invalidates old JWTs", async () => {
      const { authService, session, token } = await registerAndRequestReset();

      const newSession = await authService.resetPassword({
        token,
        password: "nova-senha-segura",
      });

      const [stored] = await primary.db.select().from(users);
      expect(stored?.tokenVersion).toBe(1);

      const dependencies = {
        jwtService,
        userRepository: new DrizzleUserRepository(primary.db),
      };
      const oldRequest = new Request("https://radarinvest.local/protegido", {
        headers: { authorization: `Bearer ${session.accessToken}` },
      });
      const newRequest = new Request("https://radarinvest.local/protegido", {
        headers: { authorization: `Bearer ${newSession.accessToken}` },
      });

      expect(await authenticateRequest(oldRequest, dependencies)).toBeNull();
      expect(await authenticateRequest(newRequest, dependencies)).toEqual({
        userId: session.user.id,
        tokenVersion: 1,
      });
    });

    it("invalidates every other reset token of the user", async () => {
      const context = createService();
      const registered = await context.authService.register(registerInput);
      await context.authService.requestPasswordReset({ email: registerInput.email });
      const token = context.passwordResetNotifier.notifications[0]!.token;

      // Token concorrente criado diretamente, como se viesse de outro pedido.
      await primary.db.insert(passwordResetTokens).values({
        userId: registered.user.id,
        tokenHash: hashResetToken("outro-token"),
        expiresAt: new Date(Date.now() + 1_800_000),
      });

      await context.authService.resetPassword({ token, password: "nova-senha-segura" });

      const stored = await primary.db.select().from(passwordResetTokens);
      expect(stored).toHaveLength(2);
      expect(stored.every((row) => row.usedAt !== null)).toBe(true);
      await expect(
        context.authService.resetPassword({
          token: "outro-token",
          password: "mais-uma-senha-segura",
        }),
      ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
    });

    it("rejects an expired token", async () => {
      const { authService, session, token } = await registerAndRequestReset();

      await primary.db
        .update(passwordResetTokens)
        .set({ expiresAt: new Date(Date.now() - 1_000) })
        .where(eq(passwordResetTokens.userId, session.user.id));

      await expect(
        authService.resetPassword({ token, password: "nova-senha-segura" }),
      ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
      expect((await primary.db.select().from(users))[0]?.tokenVersion).toBe(0);
    });

    it("rejects a token that was already used", async () => {
      const { authService, token } = await registerAndRequestReset();
      await authService.resetPassword({ token, password: "nova-senha-segura" });

      await expect(
        authService.resetPassword({ token, password: "mais-uma-senha-segura" }),
      ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
    });

    it("allows a token to be consumed exactly once under concurrency", async () => {
      const { token } = await registerAndRequestReset();
      const tokenHash = hashResetToken(token);
      const now = new Date();

      const [first, second] = await Promise.all([
        new DrizzlePasswordResetTokenRepository(primary.db).completePasswordReset({
          tokenHash,
          passwordHash: "hash-da-primeira-tentativa",
          now,
        }),
        new DrizzlePasswordResetTokenRepository(secondary.db).completePasswordReset({
          tokenHash,
          passwordHash: "hash-da-segunda-tentativa",
          now,
        }),
      ]);

      expect([first, second].filter((result) => result !== null)).toHaveLength(1);
    });

    it("allows at most one token to be issued for concurrent requests within the cooldown", async () => {
      const { authService } = createService();
      const registered = await authService.register(registerInput);
      const now = new Date();
      const baseInput = {
        userId: registered.user.id,
        expiresAt: new Date(now.getTime() + 1_800_000),
        cooldownSeconds: 60,
        now,
      };

      const [first, second] = await Promise.all([
        new DrizzlePasswordResetTokenRepository(primary.db).issueTokenIfAllowed({
          ...baseInput,
          tokenHash: hashResetToken("token-da-primeira-solicitacao"),
        }),
        new DrizzlePasswordResetTokenRepository(secondary.db).issueTokenIfAllowed({
          ...baseInput,
          tokenHash: hashResetToken("token-da-segunda-solicitacao"),
        }),
      ]);

      expect([first, second].filter(Boolean)).toHaveLength(1);
      expect(await primary.db.select().from(passwordResetTokens)).toHaveLength(1);
    });

    it("removes reset tokens when the user is deleted", async () => {
      const { session } = await registerAndRequestReset();

      await primary.db.delete(users).where(eq(users.id, session.user.id));

      expect(await primary.db.select().from(passwordResetTokens)).toHaveLength(0);
    });
  });
});
