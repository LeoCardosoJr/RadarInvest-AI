export interface FeedItem {
  title: string;
  source: string;
  url: string;
  summary: string;
}

export interface FeedResponse {
  generatedAt: string | null;
  interests: readonly string[];
  items: readonly FeedItem[];
  cached: boolean;
  stale: boolean;
  message?: string;
  warning?: string;
}

/**
 * Formata o timestamp de geração do feed para exibição no padrão brasileiro (America/Sao_Paulo).
 */
export function formatFeedTimestamp(isoDate: string | null): string {
  if (!isoDate) {
    return "";
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const dateFormatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

  const timeFormatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${dateFormatted} às ${timeFormatted}`;
}
