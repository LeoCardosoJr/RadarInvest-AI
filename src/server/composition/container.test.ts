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

  it("não exige configuração do Gemini apenas ao acessar feedService", () => {
    // Regressão: feedService é usado por GET /feed e POST /feed/refresh mesmo
    // em caminhos que nunca chegam à IA (sem preferências, cache hit,
    // cooldown). Validar o Gemini só por acessar a propriedade quebraria
    // esses caminhos sem GEMINI_API_KEY configurado.
    const env = parseServerEnv(requiredServerEnv);
    const container = createContainer(env);

    expect(() => container.feedService).not.toThrow();
    // O acesso acima não deve ter validado/consumido a config do Gemini.
    expect(() => container.aiProvider).toThrow(/GEMINI_API_KEY/);
  });

  it("expõe sempre a mesma instância de feedService", () => {
    const env = parseServerEnv(requiredServerEnv);
    const container = createContainer(env);

    expect(container.feedService).toBe(container.feedService);
  });
});
