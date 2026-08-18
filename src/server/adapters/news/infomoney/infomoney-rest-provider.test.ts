import { describe, expect, it, vi } from "vitest";

import { NewsUnavailableError } from "../../../errors/app-error";
import { VALID_INFOMONEY_POSTS_JSON } from "../../../testing/news-fixtures";
import { InfoMoneyRestProvider } from "./infomoney-rest-provider";

const API_URL = "https://www.infomoney.com.br/wp-json/wp/v2/posts";

describe("InfoMoneyRestProvider", () => {
  it("tem o id 'infomoney'", () => {
    const provider = new InfoMoneyRestProvider({ apiUrl: API_URL });
    expect(provider.id).toBe("infomoney");
  });

  it("busca e retorna notícias com sucesso, usando maxItems como per_page", async () => {
    const fakeFetch = vi.fn().mockResolvedValue(Response.json(VALID_INFOMONEY_POSTS_JSON));

    const provider = new InfoMoneyRestProvider({
      apiUrl: API_URL,
      maxItems: 20,
      fetchFn: fakeFetch,
    });

    const news = await provider.fetchLatestNews();

    expect(fakeFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fakeFetch.mock.calls[0];
    const url = new URL(calledUrl as string);

    expect(url.origin + url.pathname).toBe(API_URL);
    expect(url.searchParams.get("per_page")).toBe("20");
    expect(url.searchParams.get("_fields")).toBe("id,date_gmt,title,link,excerpt");
    expect(url.searchParams.get("orderby")).toBe("date");
    expect(url.searchParams.get("order")).toBe("desc");
    expect((calledInit as RequestInit).headers).toMatchObject({
      "User-Agent": "RadarInvestAI/1.0",
    });

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

    const provider = new InfoMoneyRestProvider({ apiUrl: API_URL, fetchFn: fakeFetch });

    await expect(provider.fetchLatestNews()).rejects.toMatchObject({
      name: "NewsUnavailableError",
      code: "NEWS_UNAVAILABLE",
      status: 502,
    });
  });

  it("lança NewsUnavailableError quando ocorre erro de rede ou conexão", async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    const provider = new InfoMoneyRestProvider({ apiUrl: API_URL, fetchFn: fakeFetch });

    await expect(provider.fetchLatestNews()).rejects.toMatchObject({
      name: "NewsUnavailableError",
      code: "NEWS_UNAVAILABLE",
      status: 502,
    });
  });

  it("lança NewsUnavailableError quando o corpo não é JSON válido", async () => {
    const fakeFetch = vi
      .fn()
      .mockResolvedValue(new Response("<html>not json</html>", { status: 200 }));

    const provider = new InfoMoneyRestProvider({ apiUrl: API_URL, fetchFn: fakeFetch });

    await expect(provider.fetchLatestNews()).rejects.toBeInstanceOf(NewsUnavailableError);
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

    const provider = new InfoMoneyRestProvider({
      apiUrl: API_URL,
      timeoutMs: 10,
      fetchFn: fakeFetch,
    });

    await expect(provider.fetchLatestNews()).rejects.toThrow(NewsUnavailableError);
  });
});
