import { describe, expect, it } from "vitest";

import { parseDatabaseEnv, parseSeedEnv, parseServerEnv } from "./env-schema";

const requiredServerEnv = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/radarinvest",
  JWT_SECRET: "a-secure-test-secret-with-at-least-32-characters",
};

describe("parseDatabaseEnv", () => {
  it("requires an explicit database URL", () => {
    expect(() => parseDatabaseEnv({})).toThrow();
  });
});

describe("parseServerEnv", () => {
  it("applies non-sensitive local defaults", () => {
    const env = parseServerEnv(requiredServerEnv);

    expect(env.APP_PORT).toBe(3000);
    expect(env.FEED_TIMEZONE).toBe("America/Sao_Paulo");
  });

  it("requires an explicit JWT secret", () => {
    expect(() =>
      parseServerEnv({
        DATABASE_URL: requiredServerEnv.DATABASE_URL,
      }),
    ).toThrow();
  });

  it("accepts an empty optional Gemini configuration during bootstrap", () => {
    const env = parseServerEnv({
      ...requiredServerEnv,
      GEMINI_API_KEY: "",
      GEMINI_MODEL: "",
    });

    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.GEMINI_MODEL).toBeUndefined();
  });
});

describe("parseSeedEnv", () => {
  it("keeps the seed disabled by default", () => {
    const env = parseSeedEnv({
      DATABASE_URL: requiredServerEnv.DATABASE_URL,
    });

    expect(env.SEED_ENABLED).toBe(false);
  });

  it("requires a password when the seed is enabled", () => {
    expect(() =>
      parseSeedEnv({
        DATABASE_URL: requiredServerEnv.DATABASE_URL,
        SEED_ENABLED: "true",
      }),
    ).toThrow(/SEED_USER_PASSWORD is required/);
  });

  it("rejects an enabled seed in production", () => {
    expect(() =>
      parseSeedEnv({
        NODE_ENV: "production",
        DATABASE_URL: requiredServerEnv.DATABASE_URL,
        SEED_ENABLED: "true",
        SEED_USER_PASSWORD: "local-password",
      }),
    ).toThrow(/SEED_ENABLED must be false in production/);
  });
});
