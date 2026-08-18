import { describe, expect, it } from "vitest";

import { AiUnavailableError } from "../errors/app-error";
import type { AiSummaryInput } from "../ports/ai-provider";
import { FakeAiProvider } from "./ai-fakes";

const input: AiSummaryInput = {
  interests: ["PETR4"],
  news: [{ id: "news-1", title: "Título", description: "Descrição" }],
};

describe("FakeAiProvider abort handling", () => {
  it("rejeita imediatamente um AbortSignal já abortado, sem aguardar o delay configurado", async () => {
    const provider = new FakeAiProvider({ delayMs: 5_000 });
    const controller = new AbortController();
    controller.abort();

    const start = Date.now();
    await expect(provider.summarize(input, controller.signal)).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
    expect(Date.now() - start).toBeLessThan(100);
  });

  it("normaliza o cancelamento ocorrido durante o delay como AiUnavailableError", async () => {
    const provider = new FakeAiProvider({ delayMs: 50 });
    const controller = new AbortController();

    const pending = provider.summarize(input, controller.signal);
    setTimeout(() => controller.abort(), 5);

    await expect(pending).rejects.toBeInstanceOf(AiUnavailableError);
  });
});
