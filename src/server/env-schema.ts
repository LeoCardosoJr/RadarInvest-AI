import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

const databaseUrlSchema = z.url({ protocol: /^postgres(ql)?$/ });

const optionalDatabaseUrlSchema = z.union([
  databaseUrlSchema,
  z.literal("").transform(() => undefined),
]);

const normalizedEmailSchema = z.string().trim().toLowerCase().pipe(z.email());

const booleanStringSchema = z
  .union([z.enum(["true", "false"]), z.literal("").transform(() => "false" as const)])
  .default("false")
  .transform((value) => value === "true");

const optionalNonEmptyString = z.union([
  z.string().trim().min(1),
  z.literal("").transform(() => undefined),
]);

const smtpConfigurationFields = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "PASSWORD_RESET_FROM_EMAIL",
] as const;

type SmtpEnvironment = Partial<Record<(typeof smtpConfigurationFields)[number], unknown>> & {
  SMTP_SECURE?: boolean;
};

function hasSmtpConfiguration(env: SmtpEnvironment): boolean {
  return (
    env.SMTP_SECURE === true || smtpConfigurationFields.some((field) => env[field] !== undefined)
  );
}

function optionalPortSchema() {
  return z.union([
    z.literal("").transform(() => undefined),
    z.coerce.number().int().positive().max(65_535),
  ]);
}

export const databaseEnvSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
});

export const migrationEnvSchema = z
  .object({
    DATABASE_URL: optionalDatabaseUrlSchema.optional(),
    MIGRATION_DATABASE_URL: optionalDatabaseUrlSchema.optional(),
  })
  .superRefine((env, context) => {
    if (!env.MIGRATION_DATABASE_URL && !env.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["MIGRATION_DATABASE_URL"],
        message: "MIGRATION_DATABASE_URL or DATABASE_URL is required.",
      });
    }
  })
  .transform((env) => ({
    DATABASE_URL: env.MIGRATION_DATABASE_URL ?? env.DATABASE_URL!,
  }));

export const serverEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    APP_URL: z.url().default("http://localhost:3000"),
    APP_PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: databaseUrlSchema,

    JWT_SECRET: z.string().min(32),
    JWT_ISSUER: z.string().trim().min(1).default("radarinvest-ai"),
    JWT_AUDIENCE: z.string().trim().min(1).default("radarinvest-web"),
    JWT_EXPIRES_IN: z.string().trim().min(1).default("1h"),
    PASSWORD_HASH_COST: z.coerce.number().int().min(10).max(16).default(12),

    PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().max(1_440).default(30),
    PASSWORD_RESET_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(60),

    SMTP_HOST: optionalNonEmptyString.optional(),
    SMTP_PORT: optionalPortSchema().optional(),
    SMTP_SECURE: booleanStringSchema,
    SMTP_USER: optionalNonEmptyString.optional(),
    SMTP_PASSWORD: optionalNonEmptyString.optional(),
    PASSWORD_RESET_FROM_EMAIL: z
      .union([normalizedEmailSchema, z.literal("").transform(() => undefined)])
      .optional(),

    AI_PROVIDER: z.literal("gemini").default("gemini"),
    GEMINI_API_KEY: optionalNonEmptyString.optional(),
    GEMINI_MODEL: optionalNonEmptyString.optional(),
    GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),

    NEWS_PROVIDER: z.literal("infomoney").default("infomoney"),
    INFOMONEY_RSS_URL: z.url().default("https://www.infomoney.com.br/feed/"),
    NEWS_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
    NEWS_MAX_ITEMS: z.coerce.number().int().positive().max(100).default(20),

    FEED_TIMEZONE: z.string().trim().min(1).default("America/Sao_Paulo"),
    FEED_REFRESH_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(60),
  })
  .superRefine((env, context) => {
    // O envio de recuperação é opcional, mas parcial nunca: ou o SMTP está
    // completo, ou a aplicação assume explicitamente que não envia e-mail.
    if (hasSmtpConfiguration(env)) {
      const requiredFields = ["SMTP_HOST", "SMTP_PORT", "PASSWORD_RESET_FROM_EMAIL"] as const;

      for (const field of requiredFields) {
        if (env[field] === undefined) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: `${field} is required when SMTP delivery is configured.`,
          });
        }
      }
    }

    if ((env.SMTP_USER === undefined) !== (env.SMTP_PASSWORD === undefined)) {
      context.addIssue({
        code: "custom",
        path: [env.SMTP_USER === undefined ? "SMTP_USER" : "SMTP_PASSWORD"],
        message: "SMTP_USER and SMTP_PASSWORD must be configured together.",
      });
    }
  });

export const seedEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    DATABASE_URL: databaseUrlSchema,
    PASSWORD_HASH_COST: z.coerce.number().int().min(10).max(16).default(12),

    SEED_ENABLED: booleanStringSchema,
    SEED_USER_NAME: z.string().trim().min(1).default("Usuário Demo"),
    SEED_USER_EMAIL: normalizedEmailSchema.default("demo@radarinvest.local"),
    SEED_USER_PASSWORD: z.string().min(8).optional(),
    SEED_USER_INTERESTS: z.string().default("PETR4,VALE3,taxa Selic"),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV === "production" && env.SEED_ENABLED) {
      context.addIssue({
        code: "custom",
        path: ["SEED_ENABLED"],
        message: "SEED_ENABLED must be false in production.",
      });
    }

    if (env.SEED_ENABLED && !env.SEED_USER_PASSWORD) {
      context.addIssue({
        code: "custom",
        path: ["SEED_USER_PASSWORD"],
        message: "SEED_USER_PASSWORD is required when the seed is enabled.",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type SeedEnv = z.infer<typeof seedEnvSchema>;

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  fromEmail: string;
  appUrl: string;
}

/** Única decisão sobre SMTP: ausente usa noop; configuração parcial é inválida no schema. */
export function smtpConfigFromEnv(env: ServerEnv): SmtpConfig | null {
  if (!hasSmtpConfiguration(env)) {
    return null;
  }

  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.PASSWORD_RESET_FROM_EMAIL) {
    throw new Error("Parsed environment contains an incomplete SMTP configuration.");
  }

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromEmail: env.PASSWORD_RESET_FROM_EMAIL,
    appUrl: env.APP_URL,
  };
}

export function parseDatabaseEnv(
  source: Record<string, string | undefined>,
): z.infer<typeof databaseEnvSchema> {
  return databaseEnvSchema.parse(source);
}

export function parseMigrationEnv(
  source: Record<string, string | undefined>,
): z.infer<typeof migrationEnvSchema> {
  return migrationEnvSchema.parse(source);
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse(source);
}

export function parseSeedEnv(source: Record<string, string | undefined>): SeedEnv {
  return seedEnvSchema.parse(source);
}
