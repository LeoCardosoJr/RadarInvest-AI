import { NewsUnavailableError } from "../../../errors/app-error";
import type { NewsItem, NewsProvider } from "../../../ports/news-provider";
import { parseInfoMoneyPosts } from "./infomoney-rest-parser";

export interface InfoMoneyRestProviderConfig {
  apiUrl: string;
  timeoutMs?: number;
  maxItems?: number;
  fetchFn?: typeof fetch;
}

/**
 * Consome a API pública (REST JSON) do WordPress que hospeda o InfoMoney. Não é um contrato
 * publicado oficialmente pelo InfoMoney (ao contrário do RSS), então qualquer falha — HTTP,
 * rede, timeout ou corpo inesperado — é normalizada para `NewsUnavailableError`.
 */
export class InfoMoneyRestProvider implements NewsProvider {
  readonly id = "infomoney";
  private readonly apiUrl: string;
  private readonly timeoutMs: number;
  private readonly maxItems: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: InfoMoneyRestProviderConfig) {
    this.apiUrl = config.apiUrl;
    this.timeoutMs = config.timeoutMs ?? 5_000;
    this.maxItems = config.maxItems ?? 20;
    this.fetchFn = config.fetchFn ?? globalThis.fetch;
  }

  private buildRequestUrl(): string {
    const url = new URL(this.apiUrl);
    url.searchParams.set("per_page", String(this.maxItems));
    url.searchParams.set("_fields", "id,date_gmt,title,link,excerpt");
    url.searchParams.set("orderby", "date");
    url.searchParams.set("order", "desc");
    return url.toString();
  }

  async fetchLatestNews(signal?: AbortSignal): Promise<NewsItem[]> {
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    try {
      const response = await this.fetchFn(this.buildRequestUrl(), {
        signal: combinedSignal,
        headers: {
          "User-Agent": "RadarInvestAI/1.0",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new NewsUnavailableError(
          `Falha ao obter notícias do InfoMoney (HTTP ${response.status}).`,
        );
      }

      const payload: unknown = await response.json();

      return parseInfoMoneyPosts(payload, {
        sourceName: "InfoMoney",
        maxItems: this.maxItems,
      });
    } catch (error) {
      if (error instanceof NewsUnavailableError) {
        throw error;
      }

      throw new NewsUnavailableError("Fonte de notícias temporariamente indisponível.", error);
    }
  }
}
