export const VALID_INFOMONEY_RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>InfoMoney</title>
    <link>https://www.infomoney.com.br</link>
    <description>Mercados, Empresas, Política e Economia</description>
    <language>pt-BR</language>
    <item>
      <title><![CDATA[Petrobras (PETR4) anuncia dividendos bilionários após resultado trimestral]]></title>
      <link>https://www.infomoney.com.br/mercados/petrobras-petr4-anuncia-dividendos-bilionarios/</link>
      <guid isPermaLink="true">https://www.infomoney.com.br/mercados/petrobras-petr4-anuncia-dividendos-bilionarios/</guid>
      <description><![CDATA[<p>Conselho de administração da <strong>Petrobras</strong> aprovou o pagamento de R$ 1,20 por ação ordinária e preferencial.</p>]]></description>
      <pubDate>Tue, 18 Aug 2026 10:30:00 -0300</pubDate>
      <dc:creator><![CDATA[Redação InfoMoney]]></dc:creator>
    </item>
    <item>
      <title>Copom indica Selic est&aacute;vel e mercado &ldquo;recalibra&rdquo; proje&ccedil;&otilde;es de juros</title>
      <link>https://www.infomoney.com.br/economia/copom-indica-selic-estavel-e-mercado-recalibra-projecoes/</link>
      <guid isPermaLink="true">https://www.infomoney.com.br/economia/copom-indica-selic-estavel-e-mercado-recalibra-projecoes/</guid>
      <description>Ata do Banco Central refor&ccedil;ou cautela no cen&aacute;rio externo e press&otilde;es inflacion&aacute;rias dom&eacute;sticas.</description>
      <pubDate>Tue, 18 Aug 2026 09:15:00 -0300</pubDate>
    </item>
    <item>
      <title><![CDATA[Vale (VALE3) avança com alta do minério de ferro em Dalian]]></title>
      <link>https://www.infomoney.com.br/mercados/vale-vale3-avanca-com-alta-do-minerio/</link>
      <description><![CDATA[<img src="https://www.infomoney.com.br/wp-content/uploads/vale.jpg" alt="Vale" /><p>Ações da mineradora acompanham o bom humor nos mercados asiáticos nesta terça-feira.</p>]]></description>
      <pubDate>Tue, 18 Aug 2026 08:00:00 -0300</pubDate>
    </item>
  </channel>
</rss>`;

export const RSS_XML_WITH_DUPLICATES = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>InfoMoney Duplicatas</title>
    <link>https://www.infomoney.com.br</link>
    <item>
      <title>Notícia 1</title>
      <link>https://www.infomoney.com.br/mercados/noticia-1/</link>
      <description>Primeira versão</description>
      <pubDate>Tue, 18 Aug 2026 10:00:00 -0300</pubDate>
    </item>
    <item>
      <title>Notícia 1 Repetida</title>
      <link>https://www.infomoney.com.br/mercados/noticia-1/</link>
      <description>Segunda versão da mesma URL</description>
      <pubDate>Tue, 18 Aug 2026 10:05:00 -0300</pubDate>
    </item>
    <item>
      <title>Notícia 2</title>
      <link>https://www.infomoney.com.br/mercados/noticia-2/</link>
      <description>Outra notícia distinta</description>
      <pubDate>Tue, 18 Aug 2026 10:10:00 -0300</pubDate>
    </item>
  </channel>
</rss>`;

export const RSS_XML_WITH_INVALID_ITEMS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>InfoMoney Inválidos</title>
    <item>
      <title></title>
      <link>https://www.infomoney.com.br/mercados/sem-titulo/</link>
      <description>Item sem título válido</description>
    </item>
    <item>
      <title>Item sem link</title>
      <link></link>
      <description>Descrição de item sem link</description>
    </item>
    <item>
      <title>Item Válido</title>
      <link>https://www.infomoney.com.br/mercados/item-valido/</link>
      <description>Descrição válida</description>
    </item>
  </channel>
</rss>`;

export const EMPTY_RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>InfoMoney Vazio</title>
    <link>https://www.infomoney.com.br</link>
    <description>Canal sem itens</description>
  </channel>
</rss>`;

export const MALFORMED_RSS_XML = `<html><body><h1>502 Bad Gateway</h1><p>Not an RSS feed</p></body></html>`;
