import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { BcryptjsPasswordHasher } from "../../adapters/security/bcryptjs-password-hasher";
import { JoseJwtService } from "../../adapters/security/jose-jwt-service";
import {
  AccountAlreadyExistsError,
  InvalidCredentialsError,
  InvalidPasswordResetTokenError,
} from "../../errors/app-error";
import {
  FakePasswordResetNotifier,
  InMemoryPasswordResetTokenRepository,
  InMemoryUserRepository,
} from "../../testing/auth-fakes";
import { AuthService, hashResetToken } from "./auth-service";

const jwtService = new JoseJwtService({
  secret: "a-secure-test-secret-with-at-least-32-characters",
  issuer: "radarinvest-ai",
  audience: "radarinvest-web",
  expiresInSeconds: 3_600,
});

function createService(options?: {
  notifier?: FakePasswordResetNotifier;
  now?: () => Date;
  cooldownSeconds?: number;
}) {
  const userRepository = new InMemoryUserRepository();
  const passwordResetTokenRepository = new InMemoryPasswordResetTokenRepository(userRepository);
  const passwordResetNotifier = options?.notifier ?? new FakePasswordResetNotifier();
  const logger = { error: vi.fn() };

  const authService = new AuthService({
    userRepository,
    passwordResetTokenRepository,
    passwordHasher: new BcryptjsPasswordHasher(10),
    jwtService,
    passwordResetNotifier,
    logger,
    config: {
      passwordResetTokenTtlMinutes: 30,
      passwordResetCooldownSeconds: options?.cooldownSeconds ?? 60,
    },
    now: options?.now,
  });

  return {
    authService,
    userRepository,
    passwordResetTokenRepository,
    passwordResetNotifier,
    logger,
  };
}

const registerInput = {
  name: "Maria Silva",
  email: "maria@example.com",
  password: "senha-segura-123",
};

describe("AuthService.register", () => {
  it("persists a hash and returns a session without the password hash", async () => {
    const { authService, userRepository } = createService();

    const session = await authService.register(registerInput);

    expect(session.user).toEqual({
      id: expect.any(String),
      name: "Maria Silva",
      email: "maria@example.com",
      createdAt: expect.any(Date),
    });
    expect(JSON.stringify(session)).not.toContain("passwordHash");

    const stored = userRepository.getCredentials(session.user.id);
    expect(stored?.passwordHash).not.toBe(registerInput.password);
    expect(await jwtService.verifyAccessToken(session.accessToken)).toEqual({
      userId: session.user.id,
      tokenVersion: 0,
    });
  });

  it("rejects a duplicated account", async () => {
    const { authService } = createService();
    await authService.register(registerInput);

    await expect(authService.register(registerInput)).rejects.toBeInstanceOf(
      AccountAlreadyExistsError,
    );
  });
});

describe("AuthService.login", () => {
  it("authenticates with the correct password", async () => {
    const { authService } = createService();
    const registered = await authService.register(registerInput);

    const session = await authService.login({
      email: registerInput.email,
      password: registerInput.password,
    });

    expect(session.user.id).toBe(registered.user.id);
    expect(await jwtService.verifyAccessToken(session.accessToken)).not.toBeNull();
  });

  it("answers identically for an unknown e-mail and a wrong password", async () => {
    const { authService } = createService();
    await authService.register(registerInput);

    const unknownEmail = await authService
      .login({ email: "ninguem@example.com", password: registerInput.password })
      .catch((error: unknown) => error);
    const wrongPassword = await authService
      .login({ email: registerInput.email, password: "senha-errada-123" })
      .catch((error: unknown) => error);

    expect(unknownEmail).toBeInstanceOf(InvalidCredentialsError);
    expect(wrongPassword).toBeInstanceOf(InvalidCredentialsError);
    expect((unknownEmail as InvalidCredentialsError).code).toBe(
      (wrongPassword as InvalidCredentialsError).code,
    );
    expect((unknownEmail as InvalidCredentialsError).message).toBe(
      (wrongPassword as InvalidCredentialsError).message,
    );
    expect((unknownEmail as InvalidCredentialsError).status).toBe(
      (wrongPassword as InvalidCredentialsError).status,
    );
  });

  it("compares against a dummy hash when the e-mail does not exist", async () => {
    const { authService, userRepository } = createService();
    const findCredentials = vi.spyOn(userRepository, "findCredentialsByEmail");

    await expect(
      authService.login({ email: "ninguem@example.com", password: "senha-qualquer" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(findCredentials).toHaveBeenCalledWith("ninguem@example.com");
  });
});

describe("AuthService.requestPasswordReset", () => {
  it("stores only the token hash and notifies the account owner", async () => {
    const { authService, passwordResetTokenRepository, passwordResetNotifier } = createService();
    await authService.register(registerInput);

    await authService.requestPasswordReset({ email: registerInput.email });

    const [notification] = passwordResetNotifier.notifications;
    const [stored] = passwordResetTokenRepository.tokens;

    expect(notification?.token).toBeTypeOf("string");
    expect(stored?.tokenHash).toBe(
      createHash("sha256").update(notification!.token, "utf8").digest("hex"),
    );
    expect(stored?.tokenHash).not.toBe(notification!.token);
    expect(stored?.tokenHash).toHaveLength(64);
  });

  it("does nothing and reveals nothing for an unknown e-mail", async () => {
    const { authService, passwordResetTokenRepository, passwordResetNotifier } = createService();

    await expect(
      authService.requestPasswordReset({ email: "ninguem@example.com" }),
    ).resolves.toBeUndefined();

    expect(passwordResetTokenRepository.tokens).toHaveLength(0);
    expect(passwordResetNotifier.notifications).toHaveLength(0);
  });

  it("invalidates the previous request when a new one is accepted", async () => {
    const clock = { value: new Date("2026-08-16T10:00:00Z") };
    const { authService, passwordResetTokenRepository } = createService({
      now: () => clock.value,
      cooldownSeconds: 0,
    });
    await authService.register(registerInput);

    await authService.requestPasswordReset({ email: registerInput.email });
    clock.value = new Date("2026-08-16T10:05:00Z");
    await authService.requestPasswordReset({ email: registerInput.email });

    expect(passwordResetTokenRepository.tokens).toHaveLength(2);
    expect(passwordResetTokenRepository.tokens[0]?.usedAt).not.toBeNull();
    expect(passwordResetTokenRepository.tokens[1]?.usedAt).toBeNull();
  });

  it("applies the persisted cooldown between requests", async () => {
    const clock = { value: new Date("2026-08-16T10:00:00Z") };
    const { authService, passwordResetNotifier } = createService({
      now: () => clock.value,
      cooldownSeconds: 60,
    });
    await authService.register(registerInput);

    await authService.requestPasswordReset({ email: registerInput.email });
    clock.value = new Date("2026-08-16T10:00:30Z");
    await authService.requestPasswordReset({ email: registerInput.email });

    expect(passwordResetNotifier.notifications).toHaveLength(1);

    clock.value = new Date("2026-08-16T10:01:30Z");
    await authService.requestPasswordReset({ email: registerInput.email });

    expect(passwordResetNotifier.notifications).toHaveLength(2);
  });

  it("keeps the public outcome unchanged when delivery fails", async () => {
    const notifier = new FakePasswordResetNotifier(new Error("smtp unavailable"));
    const { authService, logger, passwordResetTokenRepository } = createService({ notifier });
    await authService.register(registerInput);

    await expect(
      authService.requestPasswordReset({ email: registerInput.email }),
    ).resolves.toBeUndefined();

    expect(passwordResetTokenRepository.tokens).toHaveLength(1);
    expect(logger.error).toHaveBeenCalledWith("Password reset notification delivery failed.");
  });
});

describe("AuthService.resetPassword", () => {
  async function prepareReset() {
    const context = createService();
    const registered = await context.authService.register(registerInput);
    await context.authService.requestPasswordReset({ email: registerInput.email });
    const token = context.passwordResetNotifier.notifications[0]!.token;

    return { ...context, registered, token };
  }

  it("updates the password and issues a session with the new version", async () => {
    const { authService, token, registered } = await prepareReset();

    const session = await authService.resetPassword({ token, password: "nova-senha-segura" });

    expect(session.user.id).toBe(registered.user.id);
    expect(await jwtService.verifyAccessToken(session.accessToken)).toEqual({
      userId: registered.user.id,
      tokenVersion: 1,
    });

    await expect(
      authService.login({ email: registerInput.email, password: "nova-senha-segura" }),
    ).resolves.toBeDefined();
    await expect(
      authService.login({ email: registerInput.email, password: registerInput.password }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects a token that was already used", async () => {
    const { authService, token } = await prepareReset();
    await authService.resetPassword({ token, password: "nova-senha-segura" });

    await expect(
      authService.resetPassword({ token, password: "outra-senha-segura" }),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
  });

  it("rejects an expired token", async () => {
    const clock = { value: new Date("2026-08-16T10:00:00Z") };
    const context = createService({ now: () => clock.value });
    await context.authService.register(registerInput);
    await context.authService.requestPasswordReset({ email: registerInput.email });
    const token = context.passwordResetNotifier.notifications[0]!.token;

    clock.value = new Date("2026-08-16T10:31:00Z");

    await expect(
      context.authService.resetPassword({ token, password: "nova-senha-segura" }),
    ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError);
  });

  it("rejects an unknown token without revealing why", async () => {
    const { authService } = await prepareReset();

    const error = (await authService
      .resetPassword({ token: "token-inexistente", password: "nova-senha-segura" })
      .catch((thrown: unknown) => thrown)) as InvalidPasswordResetTokenError;

    expect(error).toBeInstanceOf(InvalidPasswordResetTokenError);
    expect(error.code).toBe("INVALID_RESET_TOKEN");
  });

  it("hashes the token with SHA-256 before touching the repository", () => {
    expect(hashResetToken("token-opaco")).toBe(
      createHash("sha256").update("token-opaco", "utf8").digest("hex"),
    );
  });
});
