import { createHash } from "node:crypto";

import type { NewsItem } from "../../../ports/news-provider";

export interface ParseRssOptions {
  sourceName?: string;
  maxItems?: number;
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&ndash;": "–",
  "&mdash;": "—",
  "&lsquo;": "'",
  "&rsquo;": "'",
  "&ldquo;": '"',
  "&rdquo;": '"',
  "&hellip;": "…",
  "&bull;": "•",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&deg;": "°",
  // Acentuações e caracteres em português
  "&aacute;": "á",
  "&eacute;": "é",
  "&iacute;": "í",
  "&oacute;": "ó",
  "&uacute;": "ú",
  "&Aacute;": "Á",
  "&Eacute;": "É",
  "&Iacute;": "Í",
  "&Oacute;": "Ó",
  "&Uacute;": "Ú",
  "&acirc;": "â",
  "&ecirc;": "ê",
  "&icirc;": "î",
  "&ocirc;": "ô",
  "&ucirc;": "û",
  "&Acirc;": "Â",
  "&Ecirc;": "Ê",
  "&Icirc;": "Î",
  "&Ocirc;": "Ô",
  "&Ucirc;": "Û",
  "&atilde;": "ã",
  "&otilde;": "õ",
  "&Atilde;": "Ã",
  "&Otilde;": "Õ",
  "&agrave;": "à",
  "&Agrave;": "À",
  "&ccedil;": "ç",
  "&Ccedil;": "Ç",
  "&uuml;": "ü",
  "&Uuml;": "Ü",
};

/**
 * Decodifica entidades nomeadas e numéricas (decimais/hexadecimais).
 */
export function decodeHtmlEntities(raw: string): string {
  let text = raw.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
    return NAMED_HTML_ENTITIES[match] ?? NAMED_HTML_ENTITIES[match.toLowerCase()] ?? match;
  });

  // Entidades numéricas decimais: &#123;
  text = text.replace(/&#(\d+);/g, (_, code: string) => {
    const num = Number.parseInt(code, 10);
    return Number.isFinite(num) && num > 0 && num < 0x110000 ? String.fromCodePoint(num) : "";
  });

  // Entidades numéricas hexadecimais: &#x1f;
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => {
    const num = Number.parseInt(code, 16);
    return Number.isFinite(num) && num > 0 && num < 0x110000 ? String.fromCodePoint(num) : "";
  });

  return text;
}

/**
 * Remove blocos CDATA, scripts, estilos e tags HTML, decodificando entidades e colapsando espaços.
 */
export function sanitizeHtml(raw: string): string {
  if (!raw || typeof raw !== "string") {
    return "";
  }

  // 1. Extrai o conteúdo interno de blocos CDATA
  let text = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1");

  // 2. Remove tags perigosas ou puramente de estilo com conteúdo interno
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 3. Substitui tags HTML por espaços para evitar juntar palavras coladas em tags adjacentes (ex.: <p>A</p><p>B</p> -> "A B")
  text = text.replace(/<[^>]+>/g, " ");

  // 4. Decodifica entidades HTML
  text = decodeHtmlEntities(text);

  // 5. Colapsa espaços múltiplos e faz trim
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Gera um identificador determinístico e estável para a notícia baseado na sua URL.
 */
export function generateNewsId(url: string): string {
  return createHash("sha256").update(url.trim()).digest("hex").slice(0, 16);
}

/**
 * Converte strings de data de RSS (RFC 822 / ISO) para Date ou null se inválida.
 */
export function parsePublishedDate(rawDate?: string): Date | null {
  if (!rawDate || !rawDate.trim()) {
    return null;
  }

  const parsed = new Date(rawDate.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Extrai o conteúdo de uma tag XML ignorando atributos e preservando CDATA.
 * Retorna undefined se a tag não existir ou estiver vazia após trim.
 */
export function extractTagContent(xmlSnippet: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xmlSnippet.match(regex);
  if (!match || match[1] === undefined) {
    return undefined;
  }

  const trimmed = match[1].trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Remove rodapés comuns de feeds RSS (ex.: "The post ... appeared first on InfoMoney.").
 */
function cleanDescriptionFooter(text: string): string {
  return text.replace(/The post\s+.*?\s+appeared first on\s+.*?\.\s*$/i, "").trim();
}

/**
 * Analisa o XML de RSS do InfoMoney, extraindo notícias limpas, deduplicadas e limitadas.
 */
export function parseInfoMoneyRss(xml: string, options: ParseRssOptions = {}): NewsItem[] {
  const sourceName = options.sourceName ?? "InfoMoney";
  const maxItems = options.maxItems ?? 20;

  if (!xml || typeof xml !== "string" || !xml.includes("<item")) {
    return [];
  }

  const itemMatches = xml.match(/<item(?:\s+[^>]*)?>([\s\S]*?)<\/item>/gi) ?? [];
  const items: NewsItem[] = [];
  const seenIds = new Set<string>();

  for (const itemXml of itemMatches) {
    if (items.length >= maxItems) {
      break;
    }

    const rawTitle = extractTagContent(itemXml, "title") || "";
    const rawLink = extractTagContent(itemXml, "link") || extractTagContent(itemXml, "guid") || "";
    const rawDescription =
      extractTagContent(itemXml, "description") ||
      extractTagContent(itemXml, "content:encoded") ||
      "";
    const rawPubDate =
      extractTagContent(itemXml, "pubDate") || extractTagContent(itemXml, "dc:date");

    const title = sanitizeHtml(rawTitle);
    const link = sanitizeHtml(rawLink);
    const description = cleanDescriptionFooter(sanitizeHtml(rawDescription));
    const publishedAt = parsePublishedDate(rawPubDate);

    // Itens sem URL ou sem título não têm valor informativo para o feed
    if (!link || !title) {
      continue;
    }

    const id = generateNewsId(link);

    if (seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);

    items.push({
      id,
      title,
      description,
      url: link,
      source: sourceName,
      publishedAt,
    });
  }

  return items;
}
