import { describe, expect, it } from "vitest";

import {
  EMPTY_POSTS_JSON,
  MALFORMED_POSTS_RESPONSE,
  POSTS_JSON_WITH_DUPLICATES,
  POSTS_JSON_WITH_INVALID_ITEMS,
  VALID_INFOMONEY_POSTS_JSON,
} from "../../../testing/news-fixtures";
import { parseInfoMoneyPosts } from "./infomoney-rest-parser";

describe("infomoney-rest-parser", () => {
  describe("parseInfoMoneyPosts", () => {
    it("extrai todas as notícias válidas com metadados limpos", () => {
      const items = parseInfoMoneyPosts(VALID_INFOMONEY_POSTS_JSON, { sourceName: "InfoMoney" });

      expect(items).toHaveLength(3);

      const petrobras = items[0];
      expect(petrobras.id).toBe("3455092");
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
      // date_gmt "2026-08-18T13:30:00" sem sufixo deve ser lido como UTC.
      expect(petrobras.publishedAt?.toISOString()).toBe("2026-08-18T13:30:00.000Z");

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

    it("deduplica notícias com o mesmo id", () => {
      const items = parseInfoMoneyPosts(POSTS_JSON_WITH_DUPLICATES);

      expect(items).toHaveLength(2);
      expect(items[0].id).toBe("1");
      expect(items[0].title).toBe("Notícia 1");
      expect(items[1].id).toBe("2");
    });

    it("ignora itens sem título, sem link ou sem id", () => {
      const items = parseInfoMoneyPosts(POSTS_JSON_WITH_INVALID_ITEMS);

      expect(items).toHaveLength(1);
      expect(items[0].title).toBe("Item Válido");
    });

    it("respeita o limite configurado de maxItems", () => {
      const items = parseInfoMoneyPosts(VALID_INFOMONEY_POSTS_JSON, { maxItems: 2 });
      expect(items).toHaveLength(2);
    });

    it("retorna publishedAt nulo quando date_gmt está ausente ou é inválida, sem descartar o item", () => {
      const [items1] = [
        parseInfoMoneyPosts([
          {
            id: 99,
            title: { rendered: "Sem data" },
            link: "https://www.infomoney.com.br/mercados/sem-data/",
            excerpt: { rendered: "Notícia sem date_gmt" },
          },
        ]),
      ];

      expect(items1).toHaveLength(1);
      expect(items1[0].publishedAt).toBeNull();

      const items2 = parseInfoMoneyPosts([
        {
          id: 100,
          date_gmt: "data-invalida",
          title: { rendered: "Data inválida" },
          link: "https://www.infomoney.com.br/mercados/data-invalida/",
          excerpt: { rendered: "Notícia com date_gmt inválida" },
        },
      ]);

      expect(items2).toHaveLength(1);
      expect(items2[0].publishedAt).toBeNull();
    });

    it("retorna array vazio para payload vazio ou em formato inesperado", () => {
      expect(parseInfoMoneyPosts(EMPTY_POSTS_JSON)).toEqual([]);
      expect(parseInfoMoneyPosts(MALFORMED_POSTS_RESPONSE)).toEqual([]);
      expect(parseInfoMoneyPosts(undefined)).toEqual([]);
      expect(parseInfoMoneyPosts(null)).toEqual([]);
      expect(parseInfoMoneyPosts("not an array")).toEqual([]);
    });
  });
});
