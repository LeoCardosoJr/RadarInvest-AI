import { describe, expect, it } from "vitest";

import {
  EMPTY_RSS_XML,
  MALFORMED_RSS_XML,
  RSS_XML_WITH_DUPLICATES,
  RSS_XML_WITH_INVALID_ITEMS,
  VALID_INFOMONEY_RSS_XML,
} from "../../../testing/news-fixtures";
import {
  decodeHtmlEntities,
  generateNewsId,
  parseInfoMoneyRss,
  parsePublishedDate,
  sanitizeHtml,
} from "./infomoney-rss-parser";

describe("infomoney-rss-parser", () => {
  describe("sanitizeHtml", () => {
    it("remove tags HTML e blocos CDATA preservando o texto legível", () => {
      const input = "<![CDATA[<p>Conselho da <strong>Petrobras</strong> aprovou dividendos.</p>]]>";
      expect(sanitizeHtml(input)).toBe("Conselho da Petrobras aprovou dividendos.");
    });

    it("remove tags <img> e scripts perigosos", () => {
      const input = '<img src="img.jpg" /><script>alert(1)</script><p>Notícia após imagem</p>';
      expect(sanitizeHtml(input)).toBe("Notícia após imagem");
    });

    it("colapsa espaços em branco múltiplos e quebras de linha", () => {
      const input = "  Texto   com \n\n múltiplos   espaços  ";
      expect(sanitizeHtml(input)).toBe("Texto com múltiplos espaços");
    });

    it("lida com string vazia ou inválida graciosamente", () => {
      expect(sanitizeHtml("")).toBe("");
    });
  });

  describe("decodeHtmlEntities", () => {
    it("decodifica entidades nomeadas comuns", () => {
      const input = "Petrobras &amp; Vale &ndash; Mercado &ldquo;aquecido&rdquo;";
      expect(decodeHtmlEntities(input)).toBe('Petrobras & Vale – Mercado "aquecido"');
    });

    it("decodifica entidades numéricas decimais e hexadecimais", () => {
      const input = "Selic est&#225;vel e infla&#231;&#227;o &#x2605;";
      expect(decodeHtmlEntities(input)).toBe("Selic estável e inflação ★");
    });
  });

  describe("generateNewsId", () => {
    it("gera identificador determinístico e estável de 16 caracteres", () => {
      const url = "https://www.infomoney.com.br/mercados/petrobras-petr4/";
      const id1 = generateNewsId(url);
      const id2 = generateNewsId(url);

      expect(id1).toHaveLength(16);
      expect(id1).toBe(id2);
    });

    it("gera IDs diferentes para URLs diferentes", () => {
      const id1 = generateNewsId("https://www.infomoney.com.br/noticia-1");
      const id2 = generateNewsId("https://www.infomoney.com.br/noticia-2");

      expect(id1).not.toBe(id2);
    });
  });

  describe("parsePublishedDate", () => {
    it("converte data válida em formato RFC 822 para objeto Date", () => {
      const date = parsePublishedDate("Tue, 18 Aug 2026 10:30:00 -0300");
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2026);
    });

    it("retorna null para data ausente ou inválida", () => {
      expect(parsePublishedDate(undefined)).toBeNull();
      expect(parsePublishedDate("")).toBeNull();
      expect(parsePublishedDate("data-invalida")).toBeNull();
    });
  });

  describe("parseInfoMoneyRss", () => {
    it("extrai todas as notícias válidas com metadados limpos", () => {
      const items = parseInfoMoneyRss(VALID_INFOMONEY_RSS_XML, {
        sourceName: "InfoMoney",
      });

      expect(items).toHaveLength(3);

      const petrobras = items[0];
      expect(petrobras.title).toBe(
        "Petrobras (PETR4) anuncia dividendos bilionários após resultado trimestral",
      );
      expect(petrobras.url).toBe(
        "https://www.infomoney.com.br/mercados/petrobras-petr4-anuncia-dividendos-bilionarios/",
      );
      expect(petrobras.description).toBe(
        "Conselho de administração da Petrobras aprovou o pagamento de R$ 1,20 por ação ordinária e preferencial.",
      );
      expect(petrobras.source).toBe("InfoMoney");
      expect(petrobras.publishedAt).toBeInstanceOf(Date);
      expect(petrobras.id).toHaveLength(16);

      const copom = items[1];
      expect(copom.title).toBe(
        'Copom indica Selic estável e mercado "recalibra" projeções de juros',
      );
      expect(copom.description).toBe(
        "Ata do Banco Central reforçou cautela no cenário externo e pressões inflacionárias domésticas.",
      );

      const vale = items[2];
      expect(vale.title).toBe("Vale (VALE3) avança com alta do minério de ferro em Dalian");
      expect(vale.description).toBe(
        "Ações da mineradora acompanham o bom humor nos mercados asiáticos nesta terça-feira.",
      );
    });

    it("deduplica notícias com a mesma URL", () => {
      const items = parseInfoMoneyRss(RSS_XML_WITH_DUPLICATES);

      expect(items).toHaveLength(2);
      expect(items[0].url).toBe("https://www.infomoney.com.br/mercados/noticia-1/");
      expect(items[0].title).toBe("Notícia 1");
      expect(items[1].url).toBe("https://www.infomoney.com.br/mercados/noticia-2/");
    });

    it("ignora itens sem título ou sem link", () => {
      const items = parseInfoMoneyRss(RSS_XML_WITH_INVALID_ITEMS);

      expect(items).toHaveLength(1);
      expect(items[0].title).toBe("Item Válido");
    });

    it("respeita o limite configurado de maxItems", () => {
      const items = parseInfoMoneyRss(VALID_INFOMONEY_RSS_XML, { maxItems: 2 });
      expect(items).toHaveLength(2);
    });

    it("faz fallback para guid, content:encoded e dc:date quando as tags primárias estão vazias", () => {
      const xmlWithEmptyTags = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <item>
      <title>Notícia com Fallbacks</title>
      <link>   </link>
      <guid isPermaLink="true">https://www.infomoney.com.br/mercados/fallback-url/</guid>
      <description></description>
      <content:encoded><![CDATA[<p>Descrição extraída de content:encoded</p>]]></content:encoded>
      <pubDate></pubDate>
      <dc:date>2026-08-18T12:00:00Z</dc:date>
    </item>
  </channel>
</rss>`;

      const items = parseInfoMoneyRss(xmlWithEmptyTags);
      expect(items).toHaveLength(1);
      expect(items[0].url).toBe("https://www.infomoney.com.br/mercados/fallback-url/");
      expect(items[0].description).toBe("Descrição extraída de content:encoded");
      expect(items[0].publishedAt).toBeInstanceOf(Date);
    });

    it("retorna array vazio para feed vazio ou XML corrompido", () => {
      expect(parseInfoMoneyRss(EMPTY_RSS_XML)).toEqual([]);
      expect(parseInfoMoneyRss(MALFORMED_RSS_XML)).toEqual([]);
      expect(parseInfoMoneyRss("")).toEqual([]);
    });
  });
});
