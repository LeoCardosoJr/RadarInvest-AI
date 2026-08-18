/** Payloads de `GET /wp-json/wp/v2/posts?_fields=id,date_gmt,title,link,excerpt` (formato real da API). */

export const VALID_INFOMONEY_POSTS_JSON = [
  {
    id: 3455092,
    date_gmt: "2026-08-18T13:30:00",
    title: {
      rendered: "Petrobras (PETR4) anuncia dividendos bilionários após resultado trimestral",
    },
    link: "https://www.infomoney.com.br/mercados/petrobras-petr4-anuncia-dividendos-bilionarios/",
    excerpt: {
      rendered:
        "<p>Conselho de administração da <strong>Petrobras</strong> aprovou o pagamento de R$ 1,20 por ação ordinária e preferencial.</p>\n",
    },
  },
  {
    id: 3455093,
    date_gmt: "2026-08-18T12:15:00",
    title: {
      rendered:
        "Copom indica Selic est&aacute;vel e mercado &ldquo;recalibra&rdquo; proje&ccedil;&otilde;es de juros",
    },
    link: "https://www.infomoney.com.br/economia/copom-indica-selic-estavel-e-mercado-recalibra-projecoes/",
    excerpt: {
      rendered:
        "Ata do Banco Central refor&ccedil;ou cautela no cen&aacute;rio externo e press&otilde;es inflacion&aacute;rias dom&eacute;sticas.",
    },
  },
  {
    id: 3455094,
    date_gmt: "2026-08-18T11:00:00",
    title: { rendered: "Vale (VALE3) avança com alta do minério de ferro em Dalian" },
    link: "https://www.infomoney.com.br/mercados/vale-vale3-avanca-com-alta-do-minerio/",
    excerpt: {
      rendered:
        '<img src="https://www.infomoney.com.br/wp-content/uploads/vale.jpg" alt="Vale" /><p>Ações da mineradora acompanham o bom humor nos mercados asiáticos nesta terça-feira.</p>',
    },
  },
];

export const POSTS_JSON_WITH_DUPLICATES = [
  {
    id: 1,
    date_gmt: "2026-08-18T13:00:00",
    title: { rendered: "Notícia 1" },
    link: "https://www.infomoney.com.br/mercados/noticia-1/",
    excerpt: { rendered: "Primeira versão" },
  },
  {
    id: 1,
    date_gmt: "2026-08-18T13:05:00",
    title: { rendered: "Notícia 1 Repetida" },
    link: "https://www.infomoney.com.br/mercados/noticia-1/",
    excerpt: { rendered: "Segunda versão do mesmo id" },
  },
  {
    id: 2,
    date_gmt: "2026-08-18T13:10:00",
    title: { rendered: "Notícia 2" },
    link: "https://www.infomoney.com.br/mercados/noticia-2/",
    excerpt: { rendered: "Outra notícia distinta" },
  },
];

export const POSTS_JSON_WITH_INVALID_ITEMS = [
  {
    id: 10,
    date_gmt: "2026-08-18T13:00:00",
    title: { rendered: "" },
    link: "https://www.infomoney.com.br/mercados/sem-titulo/",
    excerpt: { rendered: "Item sem título válido" },
  },
  {
    id: 11,
    date_gmt: "2026-08-18T13:00:00",
    title: { rendered: "Item sem link" },
    link: "",
    excerpt: { rendered: "Descrição de item sem link" },
  },
  {
    id: 12,
    date_gmt: "2026-08-18T13:00:00",
    title: { rendered: "Item Válido" },
    link: "https://www.infomoney.com.br/mercados/item-valido/",
    excerpt: { rendered: "Descrição válida" },
  },
];

export const EMPTY_POSTS_JSON: unknown[] = [];

export const MALFORMED_POSTS_RESPONSE = {
  code: "rest_no_route",
  message: "No route was found matching the URL and request method.",
};
