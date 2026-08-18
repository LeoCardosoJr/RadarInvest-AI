import { describe, expect, it, vi } from "vitest";

import { NewsUnavailableError } from "../../../errors/app-error";
import { VALID_INFOMONEY_RSS_XML } from "../../../testing/news-fixtures";
import { InfoMoneyRssProvider } from "./infomoney-rss-provider";

describe("InfoMoneyRssProvider", () => {
  it("tem o id 'infomoney'", () => {
    const provider = new InfoMoneyRssProvider({
      rssUrl: "https://www.infomoney.com.br/feed/",
    });
    expect(provider.id).toBe("infomoney");
  });

  it("busca e retorna notícias com sucesso", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      new Response(VALID_INFOMONEY_RSS_XML, {
        status: 200,
        headers: { "Content-Type": "application/rss+xml" },
      }),
    );

    const provider = new InfoMoneyRssProvider({
      rssUrl: "https://www.infomoney.com.br/feed/",
      fetchFn: fakeFetch,
    });

    const news = await provider.fetchLatestNews();

    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect(fakeFetch).toHaveBeenCalledWith(
      "https://www.infomoney.com.br/feed/",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": "RadarInvestAI/1.0",
        }),
      }),
    );

    expect(news).toHaveLength(3);
    expect(news[0].title).toContain("Petrobras");
  });

  it("lança NewsUnavailableError quando o servidor retorna status de erro HTTP", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(
      new Response("Internal Server Error", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    const provider = new InfoMoneyRssProvider({
      rssUrl: "https://www.infomoney.com.br/feed/",
      fetchFn: fakeFetch,
    });

    await expect(provider.fetchLatestNews()).rejects.toMatchObject({
      name: "NewsUnavailableError",
      code: "NEWS_UNAVAILABLE",
      status: 502,
    });
  });

  it("lança NewsUnavailableError quando ocorre erro de rede ou conexão", async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    const provider = new InfoMoneyRssProvider({
      rssUrl: "https://www.infomoney.com.br/feed/",
      fetchFn: fakeFetch,
    });

    await expect(provider.fetchLatestNews()).rejects.toMatchObject({
      name: "NewsUnavailableError",
      code: "NEWS_UNAVAILABLE",
      status: 502,
    });
  });

  it("lança NewsUnavailableError quando o timeout é atingido ou signal é abortado", async () => {
    const fakeFetch = vi
      .fn()
      .mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new DOMException("The operation was aborted.", "AbortError")),
              50,
            ),
          ),
      );

    const provider = new InfoMoneyRssProvider({
      rssUrl: "https://www.infomoney.com.br/feed/",
      timeoutMs: 10,
      fetchFn: fakeFetch,
    });

    await expect(provider.fetchLatestNews()).rejects.toThrow(NewsUnavailableError);
  });
});
