import { describe, expect, it, vi } from "vitest";

import { AiInvalidResponseError, AiUnavailableError } from "../../../errors/app-error";
import type { AiSummaryInput } from "../../../ports/ai-provider";
import { GeminiProvider, type GenerateContentFn } from "./gemini-provider";

const input: AiSummaryInput = {
  interests: ["PETR4"],
  news: [{ id: "news-1", title: "Título", description: "Descrição" }],
};

function providerWith(generateContent: GenerateContentFn, maxAttempts = 2) {
  return new GeminiProvider({
    apiKey: "fake-api-key",
    model: "fake-model",
    maxAttempts,
    generateContent,
  });
}

describe("GeminiProvider constructor", () => {
  it("rejeita apiKey vazia", () => {
    expect(() => new GeminiProvider({ apiKey: "  ", model: "fake-model" })).toThrow(/API key/);
  });

  it("rejeita model vazio", () => {
    expect(() => new GeminiProvider({ apiKey: "fake-api-key", model: " " })).toThrow(/model/i);
  });

  it("rejeita maxAttempts menor que 1", () => {
    expect(
      () => new GeminiProvider({ apiKey: "fake-api-key", model: "fake-model", maxAttempts: 0 }),
    ).toThrow(/maxAttempts/);
  });
});

describe("GeminiProvider.summarize", () => {
  it("retorna items vazio sem chamar a API quando não há notícias", async () => {
    const generateContent = vi.fn<GenerateContentFn>();
    const provider = providerWith(generateContent);

    const result = await provider.summarize({ interests: ["PETR4"], news: [] });

    expect(result).toEqual({ items: [] });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("traduz uma resposta válida para o contrato interno", async () => {
    const generateContent = vi
      .fn<GenerateContentFn>()
      .mockResolvedValue(JSON.stringify({ items: [{ newsId: "news-1", summary: "Resumo." }] }));
    const provider = providerWith(generateContent);

    const result = await provider.summarize(input);

    expect(result).toEqual({ items: [{ newsId: "news-1", summary: "Resumo." }] });
    expect(generateContent).toHaveBeenCalledTimes(1);
    const call = generateContent.mock.calls[0]![0];
    expect(call.contents).toContain("news-1");
    expect(call.systemInstruction.length).toBeGreaterThan(0);
  });

  it("tenta novamente após falha transitória e retorna sucesso na segunda tentativa", async () => {
    const generateContent = vi
      .fn<GenerateContentFn>()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(JSON.stringify({ items: [] }));
    const provider = providerWith(generateContent);

    const result = await provider.summarize(input);

    expect(result).toEqual({ items: [] });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("lança AiUnavailableError quando todas as tentativas falham por erro de transporte", async () => {
    const generateContent = vi.fn<GenerateContentFn>().mockRejectedValue(new Error("network down"));
    const provider = providerWith(generateContent);

    await expect(provider.summarize(input)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("lança AiInvalidResponseError quando a resposta não é JSON válido após todas as tentativas", async () => {
    const generateContent = vi.fn<GenerateContentFn>().mockResolvedValue("isto não é json");
    const provider = providerWith(generateContent);

    await expect(provider.summarize(input)).rejects.toBeInstanceOf(AiInvalidResponseError);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("lança AiInvalidResponseError quando o JSON não segue o schema esperado", async () => {
    const generateContent = vi
      .fn<GenerateContentFn>()
      .mockResolvedValue(JSON.stringify({ items: [{ newsId: "news-1" }] }));
    const provider = providerWith(generateContent);

    await expect(provider.summarize(input)).rejects.toBeInstanceOf(AiInvalidResponseError);
  });

  it("respeita o timeout configurado e reporta indisponibilidade", async () => {
    const generateContent = vi.fn<GenerateContentFn>().mockImplementation(
      ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const provider = new GeminiProvider({
      apiKey: "fake-api-key",
      model: "fake-model",
      timeoutMs: 5,
      maxAttempts: 1,
      generateContent,
    });

    await expect(provider.summarize(input)).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("recusa um AbortSignal externo já abortado sem chamar a API", async () => {
    const generateContent = vi.fn<GenerateContentFn>();
    const provider = providerWith(generateContent, 3);
    const controller = new AbortController();
    controller.abort();

    await expect(provider.summarize(input, controller.signal)).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("para de tentar novamente assim que o AbortSignal externo é abortado entre tentativas", async () => {
    const controller = new AbortController();
    const generateContent = vi.fn<GenerateContentFn>().mockImplementation(async () => {
      controller.abort();
      throw new Error("network down");
    });
    const provider = providerWith(generateContent, 3);

    await expect(provider.summarize(input, controller.signal)).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});
