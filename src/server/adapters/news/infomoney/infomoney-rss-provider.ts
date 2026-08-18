import { NewsUnavailableError } from "../../../errors/app-error";
import type { NewsItem, NewsProvider } from "../../../ports/news-provider";
import { parseInfoMoneyRss } from "./infomoney-rss-parser";

export interface InfoMoneyRssProviderConfig {
  rssUrl: string;
  timeoutMs?: number;
  maxItems?: number;
  fetchFn?: typeof fetch;
}

export class InfoMoneyRssProvider implements NewsProvider {
  readonly id = "infomoney";
  private readonly rssUrl: string;
  private readonly timeoutMs: number;
  private readonly maxItems: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: InfoMoneyRssProviderConfig) {
    this.rssUrl = config.rssUrl;
    this.timeoutMs = config.timeoutMs ?? 5_000;
    this.maxItems = config.maxItems ?? 20;
    this.fetchFn = config.fetchFn ?? globalThis.fetch;
  }

  async fetchLatestNews(signal?: AbortSignal): Promise<NewsItem[]> {
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    try {
      const response = await this.fetchFn(this.rssUrl, {
        signal: combinedSignal,
        headers: {
          "User-Agent": "RadarInvestAI/1.0",
          Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new NewsUnavailableError(
          `Falha ao obter notícias do InfoMoney (HTTP ${response.status}).`,
        );
      }

      const xml = await response.text();
      return parseInfoMoneyRss(xml, {
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
