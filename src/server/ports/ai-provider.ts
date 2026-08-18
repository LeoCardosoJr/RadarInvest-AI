export interface AiNewsInput {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export interface AiSummaryInput {
  readonly interests: readonly string[];
  readonly news: readonly AiNewsInput[];
}

export interface AiSummaryItem {
  readonly newsId: string;
  readonly summary: string;
}

export interface AiSummaryResult {
  readonly items: readonly AiSummaryItem[];
}

export interface AiProvider {
  readonly id: string;
  summarize(input: AiSummaryInput, signal?: AbortSignal): Promise<AiSummaryResult>;
}
