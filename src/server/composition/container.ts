import "server-only";

import { createAiProvider } from "../adapters/ai/ai-provider-registry";
import { InfoMoneyRestProvider } from "../adapters/news/infomoney/infomoney-rest-provider";
import { NoopPasswordResetNotifier } from "../adapters/notifications/noop-password-reset-notifier";
import { NodemailerMailTransport } from "../adapters/notifications/nodemailer-mail-transport";
import { SmtpPasswordResetNotifier } from "../adapters/notifications/smtp-password-reset-notifier";
import { DrizzleFeedCacheRepository } from "../adapters/persistence/drizzle/drizzle-feed-cache-repository";
import { DrizzlePasswordResetTokenRepository } from "../adapters/persistence/drizzle/drizzle-password-reset-token-repository";
import { DrizzlePreferencesRepository } from "../adapters/persistence/drizzle/drizzle-preferences-repository";
import { DrizzleUserRepository } from "../adapters/persistence/drizzle/drizzle-user-repository";
import { BcryptjsPasswordHasher } from "../adapters/security/bcryptjs-password-hasher";
import { JoseJwtService } from "../adapters/security/jose-jwt-service";
import type { AuthenticationDependencies } from "../auth/authenticate-request";
import { parseDurationToSeconds } from "../auth/duration";
import { createDatabase } from "../db/client";
import { parseServerEnv, smtpConfigFromEnv, type ServerEnv } from "../env-schema";
import { AuthService } from "../modules/auth/auth-service";
import { FeedService } from "../modules/feed/feed-service";
import { PreferencesService } from "../modules/preferences/preferences-service";
import type { AiProvider } from "../ports/ai-provider";
import type { NewsProvider } from "../ports/news-provider";
import type { PasswordResetNotifier } from "../ports/password-reset-notifier";

export interface Container {
  authService: AuthService;
  preferencesService: PreferencesService;
  newsProvider: NewsProvider;
  /** Construído no primeiro acesso: rotas que não usam IA continuam sem exigir Gemini. */
  readonly aiProvider: AiProvider;
  /** Depende de `aiProvider`; construído no primeiro acesso pelo mesmo motivo. */
  readonly feedService: FeedService;
  authentication: AuthenticationDependencies;
  sessionCookie: { secure: boolean; maxAgeSeconds: number };
}

let cachedContainer: Container | undefined;

function createPasswordResetNotifier(env: ServerEnv): PasswordResetNotifier {
  const smtp = smtpConfigFromEnv(env);

  if (!smtp) {
    return new NoopPasswordResetNotifier();
  }

  const transport = new NodemailerMailTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    user: smtp.user,
    password: smtp.password,
  });

  return new SmtpPasswordResetNotifier(transport, {
    appUrl: smtp.appUrl,
    fromEmail: smtp.fromEmail,
  });
}

export function createContainer(env: ServerEnv): Container {
  const { db } = createDatabase(env.DATABASE_URL);
  const accessTokenTtlSeconds = parseDurationToSeconds(env.JWT_EXPIRES_IN);

  const userRepository = new DrizzleUserRepository(db);
  const preferencesRepository = new DrizzlePreferencesRepository(db);
  const preferencesService = new PreferencesService(preferencesRepository);
  const feedCacheRepository = new DrizzleFeedCacheRepository(db);
  const newsProvider = new InfoMoneyRestProvider({
    apiUrl: env.INFOMONEY_API_URL,
    timeoutMs: env.NEWS_TIMEOUT_MS,
    maxItems: env.NEWS_MAX_ITEMS,
  });
  const jwtService = new JoseJwtService({
    secret: env.JWT_SECRET,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresInSeconds: accessTokenTtlSeconds,
  });
  const authService = new AuthService({
    userRepository,
    passwordResetTokenRepository: new DrizzlePasswordResetTokenRepository(db),
    passwordHasher: new BcryptjsPasswordHasher(env.PASSWORD_HASH_COST),
    jwtService,
    passwordResetNotifier: createPasswordResetNotifier(env),
    logger: { error: (message) => console.error(message) },
    config: {
      passwordResetTokenTtlMinutes: env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
      passwordResetCooldownSeconds: env.PASSWORD_RESET_COOLDOWN_SECONDS,
    },
  });

  let cachedAiProvider: AiProvider | undefined;

  function resolveAiProvider(): AiProvider {
    cachedAiProvider ??= createAiProvider(env);
    return cachedAiProvider;
  }

  // FeedService só precisa do Gemini nos caminhos que realmente chegam à IA
  // (cache miss, refresh). Injetar `resolveAiProvider()` direto acoplaria a
  // validação da configuração ao simples acesso a `feedService`, quebrando
  // todo request de feed (mesmo estado vazio, cache hit ou cooldown) quando
  // o Gemini não está configurado. Este proxy adia a resolução para o
  // primeiro `summarize` de verdade.
  const lazyAiProvider: AiProvider = {
    get id() {
      return resolveAiProvider().id;
    },
    summarize: (input, signal) => resolveAiProvider().summarize(input, signal),
  };

  const feedService = new FeedService(
    lazyAiProvider,
    newsProvider,
    preferencesRepository,
    feedCacheRepository,
    { timeZone: env.FEED_TIMEZONE, refreshCooldownSeconds: env.FEED_REFRESH_COOLDOWN_SECONDS },
  );

  return {
    authService,
    preferencesService,
    newsProvider,
    get aiProvider(): AiProvider {
      return resolveAiProvider();
    },
    feedService,
    authentication: { jwtService, userRepository },
    sessionCookie: {
      secure: env.NODE_ENV === "production",
      maxAgeSeconds: accessTokenTtlSeconds,
    },
  };
}

/** Injeção manual, resolvida no primeiro uso e reaproveitada pelo processo. */
export function getContainer(): Container {
  cachedContainer ??= createContainer(parseServerEnv(process.env));

  return cachedContainer;
}

/** Descarta o container memoizado; usado apenas por testes. */
export function resetContainer(): void {
  cachedContainer = undefined;
}
