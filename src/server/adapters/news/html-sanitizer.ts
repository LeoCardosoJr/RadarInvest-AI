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

export function decodeHtmlEntities(raw: string): string {
  let text = raw.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
    return NAMED_HTML_ENTITIES[match] ?? NAMED_HTML_ENTITIES[match.toLowerCase()] ?? match;
  });

  text = text.replace(/&#(\d+);/g, (_, code: string) => {
    const num = Number.parseInt(code, 10);
    return Number.isFinite(num) && num > 0 && num < 0x110000 ? String.fromCodePoint(num) : "";
  });

  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => {
    const num = Number.parseInt(code, 16);
    return Number.isFinite(num) && num > 0 && num < 0x110000 ? String.fromCodePoint(num) : "";
  });

  return text;
}

/** Reaproveitado por qualquer fonte de notícia que entregue título/resumo em HTML. */
export function sanitizeHtml(raw: string): string {
  if (!raw || typeof raw !== "string") {
    return "";
  }

  let text = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1");
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  // Espaço no lugar da tag, não string vazia: evita colar palavras de tags adjacentes (<p>A</p><p>B</p> -> "A B").
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeHtmlEntities(text);

  return text.replace(/\s+/g, " ").trim();
}
