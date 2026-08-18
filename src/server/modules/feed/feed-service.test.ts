import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import {
  AiUnavailableError,
  FeedRefreshCooldownError,
  NewsUnavailableError,
} from "../../errors/app-error";
import type { NewsItem } from "../../ports/news-provider";
import type { PreferenceInput, PreferenceRecord } from "../../ports/preferences-repository";
import { FakeAiProvider } from "../../testing/ai-fakes";
import { InMemoryFeedCacheRepository } from "../../testing/feed-fakes";
import { InMemoryNewsProvider } from "../../testing/news-fakes";
import { InMemoryPreferencesRepository } from "../../testing/preferences-fakes";
import { FeedService } from "./feed-service";

const USER_ID = "user-1";

function newsItem(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: overrides.id ?? randomUUID(),
    title: overrides.title ?? "Petrobras anuncia novo dividendo",
    description: overrides.description ?? "Descrição da notícia.",
    url: overrides.url ?? "https://infomoney.com.br/noticia",
    source: overrides.source ?? "InfoMoney",
    publishedAt: overrides.publishedAt ?? new Date("2026-08-17T12:00:00Z"),
  };
}

async function withPreferences(
  repository: InMemoryPreferencesRepository,
  topics: string[],
): Promise<PreferenceRecord[]> {
  const inputs: PreferenceInput[] = topics.map((topic) => ({
    topic,
    normalizedTopic: topic.trim().toLowerCase(),
  }));

  return repository.replaceForUser(USER_ID, inputs);
}

describe("FeedService", () => {
  let preferencesRepository: InMemoryPreferencesRepository;
  let feedCacheRepository: InMemoryFeedCacheRepository;
  let newsProvider: InMemoryNewsProvider;
  let aiProvider: FakeAiProvider;
  let service: FeedService;

  beforeEach(() => {
    preferencesRepository = new InMemoryPreferencesRepository();
    feedCacheRepository = new InMemoryFeedCacheRepository();
    newsProvider = new InMemoryNewsProvider();
    aiProvider = new FakeAiProvider();
    service = new FeedService(
      aiProvider,
      newsProvider,
      preferencesRepository,
      feedCacheRepository,
      {
        timeZone: "America/Sao_Paulo",
        refreshCooldownSeconds: 60,
      },
    );
  });

  describe("getFeed", () => {
    it("retorna estado vazio sem chamar providers quando o usuário não tem preferências", async () => {
      const result = await service.getFeed(USER_ID);

      expect(result).toMatchObject({
        generatedAt: null,
        interests: [],
        items: [],
        cached: false,
        stale: false,
      });
      expect(result.message).toBeTruthy();
      expect(newsProvider.fetchCount).toBe(0);
      expect(aiProvider.summarizeCount).toBe(0);
    });

    it("em cache miss, chama os providers uma vez e persiste o resultado", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      const item = newsItem();
      newsProvider.items = [item];
      aiProvider.result = { items: [{ newsId: item.id, summary: "Resumo gerado." }] };

      const result = await service.getFeed(USER_ID);

      expect(newsProvider.fetchCount).toBe(1);
      expect(aiProvider.summarizeCount).toBe(1);
      expect(result.cached).toBe(false);
      expect(result.stale).toBe(false);
      expect(result.items).toEqual([
        { title: item.title, source: item.source, url: item.url, summary: "Resumo gerado." },
      ]);
    });

    it("em cache hit com hash compatível, não chama os providers", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      const item = newsItem();
      newsProvider.items = [item];
      aiProvider.result = { items: [{ newsId: item.id, summary: "Resumo." }] };

      await service.getFeed(USER_ID);
      const result = await service.getFeed(USER_ID);

      expect(newsProvider.fetchCount).toBe(1);
      expect(aiProvider.summarizeCount).toBe(1);
      expect(result.cached).toBe(true);
      expect(result.stale).toBe(false);
    });

    it("não reutiliza cache com hash de preferências desatualizado", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      newsProvider.items = [newsItem()];
      aiProvider.result = { items: [] };
      await service.getFeed(USER_ID);

      // Insere um cache "antigo" manualmente para a mesma data com hash diferente.
      const cacheDate = new Date().toISOString().slice(0, 10);
      await feedCacheRepository.upsertForUserAndDate(USER_ID, cacheDate, {
        preferencesHash: "hash-desatualizado",
        content: { interests: ["PETR4"], items: [] },
      });

      await withPreferences(preferencesRepository, ["PETR4", "VALE3"]);

      const secondItem = newsItem({ id: "news-2" });
      newsProvider.items = [secondItem];
      aiProvider.result = { items: [{ newsId: secondItem.id, summary: "Novo resumo." }] };

      const result = await service.getFeed(USER_ID);

      expect(result.cached).toBe(false);
      expect(result.items).toHaveLength(1);
    });

    it("descarta newsId desconhecido retornado pela IA", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      const item = newsItem();
      newsProvider.items = [item];
      aiProvider.result = {
        items: [
          { newsId: item.id, summary: "Resumo válido." },
          { newsId: "id-inventado-pela-ia", summary: "Não deve aparecer." },
        ],
      };

      const result = await service.getFeed(USER_ID);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.summary).toBe("Resumo válido.");
    });

    it("título, URL e fonte vêm sempre da notícia original, nunca da IA", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      const item = newsItem({
        title: "Título original",
        url: "https://original",
        source: "InfoMoney",
      });
      newsProvider.items = [item];
      aiProvider.result = { items: [{ newsId: item.id, summary: "Resumo qualquer." }] };

      const result = await service.getFeed(USER_ID);

      expect(result.items[0]).toEqual({
        title: "Título original",
        url: "https://original",
        source: "InfoMoney",
        summary: "Resumo qualquer.",
      });
    });

    it("não chama a IA quando a busca de notícias retorna vazia", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      newsProvider.items = [];

      const result = await service.getFeed(USER_ID);

      expect(aiProvider.summarizeCount).toBe(0);
      expect(result.items).toEqual([]);
      expect(result.cached).toBe(false);
    });

    it("propaga 502 quando a busca de notícias falha sem fallback compatível", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      newsProvider.shouldFail = true;

      await expect(service.getFeed(USER_ID)).rejects.toBeInstanceOf(NewsUnavailableError);
    });

    it("propaga 503 quando a IA falha sem fallback compatível", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      newsProvider.items = [newsItem()];
      aiProvider.shouldFail = true;

      await expect(service.getFeed(USER_ID)).rejects.toBeInstanceOf(AiUnavailableError);
    });
  });

  describe("refreshFeed", () => {
    it("gera novamente mesmo com cache válido do dia", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      const firstItem = newsItem({ id: "news-1" });
      newsProvider.items = [firstItem];
      aiProvider.result = { items: [{ newsId: firstItem.id, summary: "Primeiro resumo." }] };
      await service.getFeed(USER_ID);

      // Cooldown zerado para não interferir na intenção do teste: refresh sempre regenera.
      service = new FeedService(
        aiProvider,
        newsProvider,
        preferencesRepository,
        feedCacheRepository,
        {
          timeZone: "America/Sao_Paulo",
          refreshCooldownSeconds: 0,
        },
      );
      const secondItem = newsItem({ id: "news-2" });
      newsProvider.items = [secondItem];
      aiProvider.result = { items: [{ newsId: secondItem.id, summary: "Segundo resumo." }] };

      const result = await service.refreshFeed(USER_ID);

      expect(newsProvider.fetchCount).toBe(2);
      expect(result.cached).toBe(false);
      expect(result.stale).toBe(false);
      expect(result.items[0]?.summary).toBe("Segundo resumo.");
    });

    it("recusa refresh dentro do cooldown com 429 e retryAfterSeconds", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      newsProvider.items = [newsItem()];
      aiProvider.result = { items: [] };
      await service.getFeed(USER_ID);

      await expect(service.refreshFeed(USER_ID)).rejects.toBeInstanceOf(FeedRefreshCooldownError);

      try {
        await service.refreshFeed(USER_ID);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(FeedRefreshCooldownError);
        const cooldownError = error as FeedRefreshCooldownError;
        expect(cooldownError.status).toBe(429);
        expect(Number(cooldownError.details?.retryAfterSeconds)).toBeGreaterThan(0);
      }
    });

    it("cai no fallback stale quando a regeneração falha mas há cache compatível", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      const item = newsItem();
      newsProvider.items = [item];
      aiProvider.result = { items: [{ newsId: item.id, summary: "Resumo original." }] };
      const original = await service.getFeed(USER_ID);

      service = new FeedService(
        aiProvider,
        newsProvider,
        preferencesRepository,
        feedCacheRepository,
        {
          timeZone: "America/Sao_Paulo",
          refreshCooldownSeconds: 0,
        },
      );
      newsProvider.shouldFail = true;

      const result = await service.refreshFeed(USER_ID);

      expect(result.cached).toBe(true);
      expect(result.stale).toBe(true);
      expect(result.warning).toBeTruthy();
      expect(result.items).toEqual(original.items);
    });

    it("propaga o erro quando a regeneração falha e não há cache compatível (hash diferente)", async () => {
      await withPreferences(preferencesRepository, ["PETR4"]);
      const cacheDate = new Date().toISOString().slice(0, 10);
      await feedCacheRepository.upsertForUserAndDate(USER_ID, cacheDate, {
        preferencesHash: "hash-diferente",
        content: { interests: ["PETR4"], items: [] },
      });
      service = new FeedService(
        aiProvider,
        newsProvider,
        preferencesRepository,
        feedCacheRepository,
        {
          timeZone: "America/Sao_Paulo",
          refreshCooldownSeconds: 0,
        },
      );
      newsProvider.shouldFail = true;

      await expect(service.refreshFeed(USER_ID)).rejects.toBeInstanceOf(NewsUnavailableError);
    });

    it("retorna estado vazio sem checar cooldown quando não há preferências", async () => {
      const result = await service.refreshFeed(USER_ID);

      expect(result.generatedAt).toBeNull();
      expect(result.message).toBeTruthy();
    });
  });
});
