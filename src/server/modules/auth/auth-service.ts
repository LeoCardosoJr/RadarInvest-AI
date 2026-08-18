import { createHash, randomBytes } from "node:crypto";

import type { IssuedAccessToken, JwtService } from "../../auth/jwt-service";
import type { PasswordHasher } from "../../auth/password-hasher";
import {
  AccountAlreadyExistsError,
  InvalidCredentialsError,
  InvalidPasswordResetTokenError,
} from "../../errors/app-error";
import type { PasswordResetNotifier } from "../../ports/password-reset-notifier";
import type { PasswordResetTokenRepository } from "../../ports/password-reset-token-repository";
import type { PublicUser, UserRepository } from "../../ports/user-repository";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth-schemas";
import { normalizeEmail } from "./normalize-email";

/** 32 bytes de entropia; o valor trafega em base64url e nunca é persistido. */
const RESET_TOKEN_BYTES = 32;

export interface AuthenticatedSession extends IssuedAccessToken {
  user: PublicUser;
}

export interface AuthLogger {
  error(message: string): void;
}

export interface AuthServiceConfig {
  passwordResetTokenTtlMinutes: number;
  passwordResetCooldownSeconds: number;
}

export interface AuthServiceDependencies {
  userRepository: UserRepository;
  passwordResetTokenRepository: PasswordResetTokenRepository;
  passwordHasher: PasswordHasher;
  jwtService: JwtService;
  passwordResetNotifier: PasswordResetNotifier;
  logger: AuthLogger;
  config: AuthServiceConfig;
  now?: () => Date;
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export class AuthService {
  constructor(private readonly dependencies: AuthServiceDependencies) {}

  async register(input: RegisterInput): Promise<AuthenticatedSession> {
    const passwordHash = await this.dependencies.passwordHasher.hash(input.password);

    // Sem consulta prévia: a unique constraint decide, o que também resolve
    // dois cadastros simultâneos com o mesmo e-mail.
    const user = await this.dependencies.userRepository.create({
      name: input.name,
      email: normalizeEmail(input.email),
      passwordHash,
    });

    if (!user) {
      throw new AccountAlreadyExistsError();
    }

    return this.issueSession(user, 0);
  }

  async login(input: LoginInput): Promise<AuthenticatedSession> {
    const credentials = await this.dependencies.userRepository.findCredentialsByEmail(
      normalizeEmail(input.email),
    );

    if (!credentials) {
      // Compara contra um hash descartável para que o caminho do e-mail
      // inexistente não seja evidentemente mais curto que o da senha errada.
      await this.dependencies.passwordHasher.verify(
        input.password,
        await this.dependencies.passwordHasher.dummyHash(),
      );

      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.dependencies.passwordHasher.verify(
      input.password,
      credentials.passwordHash,
    );

    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    return this.issueSession(
      {
        id: credentials.id,
        name: credentials.name,
        email: credentials.email,
        createdAt: credentials.createdAt,
      },
      credentials.tokenVersion,
    );
  }

  /** Sempre termina da mesma forma, exista ou não a conta. */
  async requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
    const credentials = await this.dependencies.userRepository.findCredentialsByEmail(
      normalizeEmail(input.email),
    );

    if (!credentials) {
      return;
    }

    const now = this.currentTime();
    const token = randomBytes(RESET_TOKEN_BYTES).toString("base64url");
    const expiresAt = new Date(
      now.getTime() + this.dependencies.config.passwordResetTokenTtlMinutes * 60_000,
    );

    // Checagem do cooldown e escrita do token são atômicas no repository, o
    // que evita duas solicitações concorrentes criando dois tokens ativos.
    const issued = await this.dependencies.passwordResetTokenRepository.issueTokenIfAllowed({
      userId: credentials.id,
      tokenHash: hashResetToken(token),
      expiresAt,
      cooldownSeconds: this.dependencies.config.passwordResetCooldownSeconds,
      now,
    });

    if (!issued) {
      return;
    }

    try {
      await this.dependencies.passwordResetNotifier.notifyPasswordReset({
        email: credentials.email,
        name: credentials.name,
        token,
        expiresAt,
      });
    } catch {
      // A falha de entrega não pode alterar a resposta pública nem descrever a
      // conta envolvida; só o fato do erro é registrado.
      this.dependencies.logger.error("Password reset notification delivery failed.");
    }
  }

  async resetPassword(input: ResetPasswordInput): Promise<AuthenticatedSession> {
    const now = this.currentTime();
    const passwordHash = await this.dependencies.passwordHasher.hash(input.password);

    // Consumo do token e troca de senha acontecem na mesma transação do
    // repository: uma falha entre os dois passos desfaz ambos, em vez de
    // deixar o token gasto com a senha antiga.
    const result = await this.dependencies.passwordResetTokenRepository.completePasswordReset({
      tokenHash: hashResetToken(input.token),
      passwordHash,
      now,
    });

    // Token ausente, desconhecido, já usado ou expirado são o mesmo erro.
    if (!result) {
      throw new InvalidPasswordResetTokenError();
    }

    return this.issueSession(result.user, result.tokenVersion);
  }

  private async issueSession(
    user: PublicUser,
    tokenVersion: number,
  ): Promise<AuthenticatedSession> {
    const issued = await this.dependencies.jwtService.issueAccessToken({
      userId: user.id,
      tokenVersion,
    });

    return { user, ...issued };
  }

  private currentTime(): Date {
    return this.dependencies.now?.() ?? new Date();
  }
}
