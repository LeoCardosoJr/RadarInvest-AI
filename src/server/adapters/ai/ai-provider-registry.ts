import type { ServerEnv } from "../../env-schema";
import type { AiProvider } from "../../ports/ai-provider";
import { GeminiProvider } from "./gemini/gemini-provider";

export type AiProviderFactory = (env: ServerEnv) => AiProvider;

function createGeminiProvider(env: ServerEnv): AiProvider {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required to use AI_PROVIDER=gemini.");
  }

  if (!env.GEMINI_MODEL) {
    throw new Error("GEMINI_MODEL is required to use AI_PROVIDER=gemini.");
  }

  return new GeminiProvider({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
    timeoutMs: env.GEMINI_TIMEOUT_MS,
  });
}

/** Único ponto de mapeamento `AI_PROVIDER` → adapter concreto; trocar provider é local. */
const aiProviderRegistry: Record<string, AiProviderFactory> = {
  gemini: createGeminiProvider,
};

export function createAiProvider(env: ServerEnv): AiProvider {
  const factory = aiProviderRegistry[env.AI_PROVIDER];

  if (!factory) {
    throw new Error(`Unknown AI_PROVIDER: "${env.AI_PROVIDER}".`);
  }

  return factory(env);
}
