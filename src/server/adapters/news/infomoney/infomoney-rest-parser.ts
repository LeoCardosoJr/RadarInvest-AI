import type { NewsItem } from "../../../ports/news-provider";
import { sanitizeHtml } from "../html-sanitizer";

export interface ParsePostsOptions {
  sourceName?: string;
  maxItems?: number;
}

interface RawWpPost {
  id?: unknown;
  date_gmt?: unknown;
  title?: { rendered?: unknown };
  link?: unknown;
  excerpt?: { rendered?: unknown };
}

/**
 * `date_gmt` da API pública do WordPress vem sem sufixo de fuso (ex.: "2026-08-18T22:25:17"),
 * mas já representa horário UTC. Anexar "Z" evita que o parser confie no fuso do processo.
 */
function parseWpGmtDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  const trimmed = raw.trim();
  const iso = trimmed.endsWith("Z") ? trimmed : `${trimmed}Z`;
  const parsed = new Date(iso);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toNewsId(raw: unknown): string | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }

  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }

  return undefined;
}

/**
 * Converte a resposta de `GET /wp-json/wp/v2/posts` em `NewsItem[]`, descartando itens sem
 * id/título/URL válidos e limitando a quantidade ao `maxItems` configurado.
 */
export function parseInfoMoneyPosts(payload: unknown, options: ParsePostsOptions = {}): NewsItem[] {
  const sourceName = options.sourceName ?? "InfoMoney";
  const maxItems = options.maxItems ?? 20;

  if (!Array.isArray(payload)) {
    return [];
  }

  const items: NewsItem[] = [];
  const seenIds = new Set<string>();

  for (const rawPost of payload as RawWpPost[]) {
    if (items.length >= maxItems) {
      break;
    }

    if (!rawPost || typeof rawPost !== "object") {
      continue;
    }

    const id = toNewsId(rawPost.id);
    const title = sanitizeHtml(
      typeof rawPost.title?.rendered === "string" ? rawPost.title.rendered : "",
    );
    const link = typeof rawPost.link === "string" ? rawPost.link.trim() : "";
    const description = sanitizeHtml(
      typeof rawPost.excerpt?.rendered === "string" ? rawPost.excerpt.rendered : "",
    );

    if (!id || !link || !title || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);

    items.push({
      id,
      title,
      description,
      url: link,
      source: sourceName,
      publishedAt: parseWpGmtDate(rawPost.date_gmt),
    });
  }

  return items;
}
