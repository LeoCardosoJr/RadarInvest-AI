import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { FeedResponse } from "@/lib/feed";
import { FeedCard } from "./feed-card";
import { FeedSection } from "./feed-section";

describe("Feed components", () => {
  const sampleItem = {
    title: "Petrobras anuncia dividendos extraordinários",
    source: "InfoMoney",
    url: "https://www.infomoney.com.br/petrobras-dividendos",
    summary: "Conselho aprova distribuição extraordinária para acionistas.",
  };

  const sampleFeed: FeedResponse = {
    generatedAt: "2026-08-18T17:30:00.000Z",
    interests: ["PETR4"],
    items: [sampleItem],
    cached: true,
    stale: false,
  };

  describe("FeedCard", () => {
    it("renders news title, source, summary and external link attributes", () => {
      const html = renderToStaticMarkup(<FeedCard item={sampleItem} />);

      expect(html).toContain("Petrobras anuncia dividendos extraordinários");
      expect(html).toContain("InfoMoney");
      expect(html).toContain("Conselho aprova distribuição extraordinária para acionistas.");
      expect(html).toContain('href="https://www.infomoney.com.br/petrobras-dividendos"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });
  });

  describe("FeedSection", () => {
    it("renders items and cached badge when feed has items", () => {
      const html = renderToStaticMarkup(
        <FeedSection feed={sampleFeed} onFeedChange={vi.fn()} preferencesCount={1} />,
      );

      expect(html).toContain("Seu Feed");
      expect(html).toContain("Em cache");
      expect(html).toContain("Petrobras anuncia dividendos extraordinários");
      expect(html).toContain("Aviso:");
      expect(html).toContain("Não constituem recomendação");
    });

    it("renders stale contingency badge and warning alert when stale is true", () => {
      const staleFeed: FeedResponse = {
        ...sampleFeed,
        cached: true,
        stale: true,
        warning: "Exibindo resumo anterior em modo de contingência.",
      };

      const html = renderToStaticMarkup(
        <FeedSection feed={staleFeed} onFeedChange={vi.fn()} preferencesCount={1} />,
      );

      expect(html).toContain("Modo contingência");
      expect(html).toContain("Exibindo resumo anterior em modo de contingência.");
    });

    it("renders empty state when user has no preferences", () => {
      const emptyFeed: FeedResponse = {
        generatedAt: null,
        interests: [],
        items: [],
        cached: false,
        stale: false,
      };

      const html = renderToStaticMarkup(
        <FeedSection feed={emptyFeed} onFeedChange={vi.fn()} preferencesCount={0} />,
      );

      expect(html).toContain("Nenhum interesse cadastrado");
      expect(html).toContain("Adicione tópicos ou ativos");
    });

    it("renders no-news empty state when user has preferences but items array is empty", () => {
      const noNewsFeed: FeedResponse = {
        generatedAt: "2026-08-18T17:30:00.000Z",
        interests: ["TICKER_RARO"],
        items: [],
        cached: true,
        stale: false,
        message: "Nenhum artigo recente encontrado.",
      };

      const html = renderToStaticMarkup(
        <FeedSection feed={noNewsFeed} onFeedChange={vi.fn()} preferencesCount={1} />,
      );

      expect(html).toContain("Nenhuma notícia relevante encontrada hoje");
      expect(html).toContain("Nenhum artigo recente encontrado.");
    });
  });
});
