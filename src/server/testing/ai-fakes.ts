import { AiInvalidResponseError, AiUnavailableError } from "../errors/app-error";
import type { AiProvider, AiSummaryInput, AiSummaryResult } from "../ports/ai-provider";

export interface FakeAiProviderOptions {
  result?: AiSummaryResult;
  shouldFail?: boolean;
  failureMessage?: string;
  invalidResponse?: boolean;
  delayMs?: number;
}

/**
 * Double escrito contra a porta `AiProvider`, usado nos testes de unidade.
 * Prova que quem depende de `AiProvider` funciona sem importar o SDK do Gemini.
 */
export class FakeAiProvider implements AiProvider {
  readonly id = "fake-ai-provider";
  public result: AiSummaryResult;
  public shouldFail: boolean;
  public failureMessage: string;
  public invalidResponse: boolean;
  public delayMs: number;
  public summarizeCount = 0;
  public lastInput: AiSummaryInput | undefined;

  constructor(options: FakeAiProviderOptions = {}) {
    this.result = options.result ?? { items: [] };
    this.shouldFail = options.shouldFail ?? false;
    this.failureMessage = options.failureMessage ?? "Erro simulado no FakeAiProvider.";
    this.invalidResponse = options.invalidResponse ?? false;
    this.delayMs = options.delayMs ?? 0;
  }

  async summarize(input: AiSummaryInput, signal?: AbortSignal): Promise<AiSummaryResult> {
    this.summarizeCount++;
    this.lastInput = input;

    if (signal?.aborted) {
      throw new AiUnavailableError("Operação cancelada por timeout.", signal.reason);
    }

    if (this.delayMs > 0) {
      try {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, this.delayMs);
          signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
      } catch (error) {
        throw new AiUnavailableError("Operação cancelada por timeout.", error);
      }
    }

    if (this.shouldFail) {
      throw new AiUnavailableError(this.failureMessage);
    }

    if (this.invalidResponse) {
      throw new AiInvalidResponseError("Resposta inválida simulada.");
    }

    return this.result;
  }
}
