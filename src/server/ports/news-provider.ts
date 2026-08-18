export interface NewsItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly source: string;
  readonly publishedAt: Date | null;
}

export interface NewsProvider {
  readonly id: string;
  fetchLatestNews(signal?: AbortSignal): Promise<NewsItem[]>;
}
