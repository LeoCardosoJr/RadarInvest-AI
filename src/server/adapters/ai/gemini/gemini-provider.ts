import { GoogleGenAI } from "@google/genai";

import { AiInvalidResponseError, AiUnavailableError } from "../../../errors/app-error";
import type { AiProvider, AiSummaryInput, AiSummaryResult } from "../../../ports/ai-provider";
import {
  GEMINI_RESPONSE_SCHEMA,
  SYSTEM_INSTRUCTION,
  aiSummaryResponseSchema,
  buildUserContent,
} from "./gemini-prompt";

export interface GenerateContentArgs {
  systemInstruction: string;
  contents: string;
  signal: AbortSignal;
}

/** Fronteira mínima com o SDK, substituível em testes sem chamar a API real. */
export type GenerateContentFn = (args: GenerateContentArgs) => Promise<string>;

export interface GeminiProviderConfig {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  /** Tentativas totais (>=1) antes de desistir. */
  maxAttempts?: number;
  /** Injeção para testes; por padrão chama a Gemini API real. */
  generateContent?: GenerateContentFn;
}

function createDefaultGenerateContent(apiKey: string, model: string): GenerateContentFn {
  const client = new GoogleGenAI({ apiKey });

  return async ({ systemInstruction, contents, signal }) => {
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: GEMINI_RESPONSE_SCHEMA,
        abortSignal: signal,
      },
    });

    return response.text ?? "";
  };
}

/** Único módulo, junto com `gemini-prompt.ts`, que conhece o SDK/config do Gemini. */
export class GeminiProvider implements AiProvider {
  readonly id = "gemini";
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly generateContent: GenerateContentFn;

  constructor(config: GeminiProviderConfig) {
    if (!config.apiKey.trim()) {
      throw new Error("Gemini provider requires a non-empty API key.");
    }

    if (!config.model.trim()) {
      throw new Error("Gemini provider requires a model name.");
    }

    if (config.maxAttempts !== undefined && config.maxAttempts < 1) {
      throw new Error("Gemini provider maxAttempts must be at least 1.");
    }

    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.maxAttempts = config.maxAttempts ?? 2;
    this.generateContent =
      config.generateContent ?? createDefaultGenerateContent(config.apiKey, config.model);
  }

  async summarize(input: AiSummaryInput, signal?: AbortSignal): Promise<AiSummaryResult> {
    if (input.news.length === 0) {
      return { items: [] };
    }

    const contents = buildUserContent(input);
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      if (signal?.aborted) {
        throw new AiUnavailableError("Operação cancelada.", signal.reason);
      }

      const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
      const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

      try {
        const rawText = await this.generateContent({
          systemInstruction: SYSTEM_INSTRUCTION,
          contents,
          signal: combinedSignal,
        });

        return this.parseResponse(rawText);
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof AiInvalidResponseError) {
      throw lastError;
    }

    throw new AiUnavailableError("Provedor de IA temporariamente indisponível.", lastError);
  }

  private parseResponse(rawText: string): AiSummaryResult {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      throw new AiInvalidResponseError("Resposta da IA não é um JSON válido.", error);
    }

    const result = aiSummaryResponseSchema.safeParse(parsed);

    if (!result.success) {
      throw new AiInvalidResponseError(
        "Resposta da IA não segue o formato esperado.",
        result.error,
      );
    }

    return result.data;
  }
}
