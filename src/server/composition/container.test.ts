import { describe, expect, it } from "vitest";

import { GeminiProvider } from "../adapters/ai/gemini/gemini-provider";
import { parseServerEnv } from "../env-schema";
import { createContainer } from "./container";

const requiredServerEnv = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/radarinvest",
  JWT_SECRET: "a-secure-test-secret-with-at-least-32-characters",
};

describe("createContainer", () => {
  it("monta o container sem exigir configuração do Gemini no bootstrap", () => {
    const env = parseServerEnv(requiredServerEnv);

    expect(() => createContainer(env)).not.toThrow();
  });

  it("só valida a configuração do Gemini quando aiProvider é acessado", () => {
    const env = parseServerEnv(requiredServerEnv);
    const container = createContainer(env);

    expect(() => container.aiProvider).toThrow(/GEMINI_API_KEY/);
  });

  it("memoiza o aiProvider resolvido entre acessos", () => {
    const env = parseServerEnv({
      ...requiredServerEnv,
      GEMINI_API_KEY: "fake-api-key",
      GEMINI_MODEL: "fake-model",
    });
    const container = createContainer(env);

    const first = container.aiProvider;
    const second = container.aiProvider;

    expect(first).toBeInstanceOf(GeminiProvider);
    expect(first).toBe(second);
  });
});
