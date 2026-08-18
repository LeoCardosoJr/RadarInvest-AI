import { describe, expect, it } from "vitest";

import type { AiSummaryInput } from "../../../ports/ai-provider";
import { aiSummaryResponseSchema, buildUserContent, SYSTEM_INSTRUCTION } from "./gemini-prompt";

describe("buildUserContent", () => {
  it("serializa interesses e apenas id/título/descrição das notícias", () => {
    const input: AiSummaryInput = {
      interests: ["PETR4", "Selic"],
      news: [
        {
          id: "news-1",
          title: "Petrobras anuncia dividendo",
          description: "Resumo da notícia.",
        },
      ],
    };

    const content = JSON.parse(buildUserContent(input));

    expect(content).toEqual({
      interests: ["PETR4", "Selic"],
      news: [
        {
          id: "news-1",
          title: "Petrobras anuncia dividendo",
          description: "Resumo da notícia.",
        },
      ],
    });
  });

  it("nunca inclui url ou source, mesmo se presentes em campos extras do objeto de entrada", () => {
    const input = {
      interests: [],
      news: [
        {
          id: "news-1",
          title: "Título",
          description: "Descrição",
          url: "https://example.com/noticia",
          source: "InfoMoney",
        },
      ],
    } as unknown as AiSummaryInput;

    const content = JSON.parse(buildUserContent(input));

    expect(content.news[0]).toEqual({
      id: "news-1",
      title: "Título",
      description: "Descrição",
    });
  });
});

describe("SYSTEM_INSTRUCTION", () => {
  it("instrui o modelo a tratar título/descrição como dado, não comando", () => {
    expect(SYSTEM_INSTRUCTION).toMatch(/nunca invente/i);
    expect(SYSTEM_INSTRUCTION).toMatch(/dado, nunca como instrução/i);
  });
});

describe("aiSummaryResponseSchema", () => {
  it("aceita uma resposta estruturalmente válida", () => {
    const result = aiSummaryResponseSchema.safeParse({
      items: [{ newsId: "news-1", summary: "Resumo." }],
    });

    expect(result.success).toBe(true);
  });

  it("aceita lista vazia de items", () => {
    const result = aiSummaryResponseSchema.safeParse({ items: [] });

    expect(result.success).toBe(true);
  });

  it.each([
    ["objeto sem items", {}],
    ["items não é array", { items: "news-1" }],
    ["item sem newsId", { items: [{ summary: "Resumo." }] }],
    ["item sem summary", { items: [{ newsId: "news-1" }] }],
    ["newsId vazio", { items: [{ newsId: "  ", summary: "Resumo." }] }],
    ["summary vazio", { items: [{ newsId: "news-1", summary: "" }] }],
    ["resposta não é objeto", "resposta livre em texto"],
  ])("rejeita resposta estruturalmente inválida: %s", (_description, payload) => {
    const result = aiSummaryResponseSchema.safeParse(payload);

    expect(result.success).toBe(false);
  });
});
