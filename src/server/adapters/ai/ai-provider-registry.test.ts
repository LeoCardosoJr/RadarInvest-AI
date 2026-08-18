import { describe, expect, it } from "vitest";

import { parseServerEnv, type ServerEnv } from "../../env-schema";
import { createAiProvider } from "./ai-provider-registry";
import { GeminiProvider } from "./gemini/gemini-provider";

const requiredServerEnv = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/radarinvest",
  JWT_SECRET: "a-secure-test-secret-with-at-least-32-characters",
};

describe("createAiProvider", () => {
  it("resolve o GeminiProvider quando AI_PROVIDER=gemini e a configuração está completa", () => {
    const env = parseServerEnv({
      ...requiredServerEnv,
      GEMINI_API_KEY: "fake-api-key",
      GEMINI_MODEL: "fake-model",
    });

    const provider = createAiProvider(env);

    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(provider.id).toBe("gemini");
  });

  it("falha na configuração quando GEMINI_API_KEY está ausente", () => {
    const env = parseServerEnv({
      ...requiredServerEnv,
      GEMINI_MODEL: "fake-model",
    });

    expect(() => createAiProvider(env)).toThrow(/GEMINI_API_KEY/);
  });

  it("falha na configuração quando GEMINI_MODEL está ausente", () => {
    const env = parseServerEnv({
      ...requiredServerEnv,
      GEMINI_API_KEY: "fake-api-key",
    });

    expect(() => createAiProvider(env)).toThrow(/GEMINI_MODEL/);
  });

  it("falha na configuração para um AI_PROVIDER desconhecido", () => {
    const env = {
      ...parseServerEnv({
        ...requiredServerEnv,
        GEMINI_API_KEY: "fake-api-key",
        GEMINI_MODEL: "fake-model",
      }),
      AI_PROVIDER: "unknown-provider",
    } as unknown as ServerEnv;

    expect(() => createAiProvider(env)).toThrow(/Unknown AI_PROVIDER/);
  });
});
