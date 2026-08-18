import { randomUUID } from "node:crypto";

import type { MailMessage, MailTransport } from "../adapters/notifications/mail-transport";
import type {
  PasswordResetNotification,
  PasswordResetNotifier,
} from "../ports/password-reset-notifier";
import type {
  CompletedPasswordReset,
  CompletePasswordResetInput,
  IssueTokenIfAllowedInput,
  PasswordResetTokenRepository,
} from "../ports/password-reset-token-repository";
import type {
  CreateUserInput,
  PublicUser,
  UserCredentials,
  UserRepository,
} from "../ports/user-repository";

/**
 * Doubles escritos contra as portas, usados apenas nos testes de unidade.
 * Concorrência, transações e constraints são verificadas com PostgreSQL real.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, UserCredentials>();

  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    for (const user of this.usersById.values()) {
      if (user.email === email) {
        return { ...user };
      }
    }

    return null;
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const user = this.usersById.get(id);

    return user ? toPublicUser(user) : null;
  }

  async findTokenVersionById(id: string): Promise<number | null> {
    return this.usersById.get(id)?.tokenVersion ?? null;
  }

  async create(input: CreateUserInput): Promise<PublicUser | null> {
    if (await this.findCredentialsByEmail(input.email)) {
      return null;
    }

    const user: UserCredentials = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      tokenVersion: 0,
      createdAt: new Date(),
    };

    this.usersById.set(user.id, user);

    return toPublicUser(user);
  }

  setPasswordHash(userId: string, passwordHash: string): void {
    const user = this.usersById.get(userId);

    if (user) {
      user.passwordHash = passwordHash;
    }
  }

  bumpTokenVersion(userId: string): number {
    const user = this.usersById.get(userId);

    if (!user) {
      throw new Error("Unknown user.");
    }

    user.tokenVersion += 1;

    return user.tokenVersion;
  }

  getCredentials(userId: string): UserCredentials | undefined {
    const user = this.usersById.get(userId);

    return user ? { ...user } : undefined;
  }
}

interface StoredResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  readonly tokens: StoredResetToken[] = [];

  constructor(private readonly userRepository: InMemoryUserRepository) {}

  async issueTokenIfAllowed(input: IssueTokenIfAllowedInput): Promise<boolean> {
    const lastToken = this.tokens
      .filter((token) => token.userId === input.userId)
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())[0];

    if (lastToken) {
      const elapsedSeconds = (input.now.getTime() - lastToken.createdAt.getTime()) / 1000;

      if (elapsedSeconds < input.cooldownSeconds) {
        return false;
      }
    }

    for (const token of this.tokens) {
      if (token.userId === input.userId && token.usedAt === null) {
        token.usedAt = input.now;
      }
    }

    this.tokens.push({
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
      createdAt: input.now,
    });

    return true;
  }

  async completePasswordReset(
    input: CompletePasswordResetInput,
  ): Promise<CompletedPasswordReset | null> {
    const token = this.tokens.find(
      (candidate) =>
        candidate.tokenHash === input.tokenHash &&
        candidate.usedAt === null &&
        candidate.expiresAt.getTime() > input.now.getTime(),
    );

    if (!token) {
      return null;
    }

    token.usedAt = input.now;
    this.userRepository.setPasswordHash(token.userId, input.passwordHash);
    const tokenVersion = this.userRepository.bumpTokenVersion(token.userId);

    for (const candidate of this.tokens) {
      if (candidate.userId === token.userId && candidate.usedAt === null) {
        candidate.usedAt = input.now;
      }
    }

    const user = await this.userRepository.findPublicById(token.userId);

    if (!user) {
      throw new Error("Password reset target user no longer exists.");
    }

    return { user, tokenVersion };
  }
}

export class FakePasswordResetNotifier implements PasswordResetNotifier {
  readonly notifications: PasswordResetNotification[] = [];

  constructor(private readonly failure?: Error) {}

  async notifyPasswordReset(notification: PasswordResetNotification): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }

    this.notifications.push(notification);
  }
}

export class FakeMailTransport implements MailTransport {
  readonly messages: MailMessage[] = [];

  async sendMail(message: MailMessage): Promise<void> {
    this.messages.push(message);
  }
}

function toPublicUser(user: UserCredentials): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}
