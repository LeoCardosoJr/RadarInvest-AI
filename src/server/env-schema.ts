import { z } from "zod";

const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

const databaseUrlSchema = z.url({ protocol: /^postgres(ql)?$/ });

const booleanStringSchema = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const optionalNonEmptyString = z.union([
  z.string().trim().min(1),
  z.literal("").transform(() => undefined),
]);

export const databaseEnvSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
});

export const serverEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  APP_URL: z.url().default("http://localhost:3000"),
  APP_PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: databaseUrlSchema,

  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().trim().min(1).default("radarinvest-ai"),
  JWT_AUDIENCE: z.string().trim().min(1).default("radarinvest-web"),
  JWT_EXPIRES_IN: z.string().trim().min(1).default("1h"),
  PASSWORD_HASH_COST: z.coerce.number().int().min(10).max(16).default(12),

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
});

export const seedEnvSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    DATABASE_URL: databaseUrlSchema,
    PASSWORD_HASH_COST: z.coerce.number().int().min(10).max(16).default(12),

    SEED_ENABLED: booleanStringSchema,
    SEED_USER_NAME: z.string().trim().min(1).default("Usuário Demo"),
    SEED_USER_EMAIL: z.email().default("demo@radarinvest.local"),
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

export function parseDatabaseEnv(
  source: Record<string, string | undefined>,
): z.infer<typeof databaseEnvSchema> {
  return databaseEnvSchema.parse(source);
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  return serverEnvSchema.parse(source);
}

export function parseSeedEnv(source: Record<string, string | undefined>): SeedEnv {
  return seedEnvSchema.parse(source);
}
