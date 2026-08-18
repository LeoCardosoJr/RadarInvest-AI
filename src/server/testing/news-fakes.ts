import { NewsUnavailableError } from "../errors/app-error";
import type { NewsItem, NewsProvider } from "../ports/news-provider";

export interface InMemoryNewsProviderOptions {
  items?: NewsItem[];
  shouldFail?: boolean;
  failureMessage?: string;
  delayMs?: number;
}

export class InMemoryNewsProvider implements NewsProvider {
  readonly id = "fake-news-provider";
  public items: NewsItem[];
  public shouldFail: boolean;
  public failureMessage: string;
  public delayMs: number;
  public fetchCount = 0;

  constructor(options: InMemoryNewsProviderOptions = {}) {
    this.items = options.items ?? [];
    this.shouldFail = options.shouldFail ?? false;
    this.failureMessage = options.failureMessage ?? "Erro simulado no InMemoryNewsProvider.";
    this.delayMs = options.delayMs ?? 0;
  }

  async fetchLatestNews(signal?: AbortSignal): Promise<NewsItem[]> {
    this.fetchCount++;

    if (this.delayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.delayMs);
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    }

    if (signal?.aborted) {
      throw new NewsUnavailableError("Operação cancelada por timeout.", signal.reason);
    }

    if (this.shouldFail) {
      throw new NewsUnavailableError(this.failureMessage);
    }

    return [...this.items];
  }
}
