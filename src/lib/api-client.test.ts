import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, getFeed, getJson, postJson, putJson, refreshFeed } from "./api-client";

describe("api-client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("getJson / getFeed", () => {
    it("makes a GET request with content-type header and returns JSON", async () => {
      const mockPayload = {
        generatedAt: "2026-08-18T14:30:00Z",
        interests: ["PETR4"],
        items: [],
        cached: true,
        stale: false,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload,
      } as Response);

      const result = await getFeed();

      expect(global.fetch).toHaveBeenCalledWith("/feed", {
        method: "GET",
        headers: { "content-type": "application/json" },
      });
      expect(result).toEqual(mockPayload);
    });

    it("throws an ApiError with details when response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: "FEED_REFRESH_COOLDOWN",
            message: "Aguarde 60 segundos.",
            details: { retryAfterSeconds: 60 },
          },
        }),
      } as Response);

      await expect(getJson("/feed")).rejects.toThrow(ApiError);

      try {
        await getJson("/feed");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.code).toBe("FEED_REFRESH_COOLDOWN");
        expect(apiError.message).toBe("Aguarde 60 segundos.");
        expect(apiError.details).toEqual({ retryAfterSeconds: 60 });
      }
    });
  });

  describe("postJson / refreshFeed", () => {
    it("makes a POST request with body and returns JSON", async () => {
      const mockPayload = { success: true };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload,
      } as Response);

      const result = await postJson("/test", { foo: "bar" });

      expect(global.fetch).toHaveBeenCalledWith("/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ foo: "bar" }),
      });
      expect(result).toEqual(mockPayload);
    });

    it("sends empty object by default when body is undefined", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response);

      await refreshFeed();

      expect(global.fetch).toHaveBeenCalledWith("/feed/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
    });

    it("handles 204 No Content without parsing JSON", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      } as Response);

      const result = await postJson("/logout");
      expect(result).toBeUndefined();
    });

    it("throws NETWORK_ERROR when fetch fails", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

      await expect(postJson("/any")).rejects.toThrowError(
        "Falha de conexão. Verifique sua rede e tente novamente.",
      );
    });
  });

  describe("putJson", () => {
    it("makes a PUT request with body", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ interests: [] }),
      } as Response);

      await putJson("/preferences", { topics: ["VALE3"] });

      expect(global.fetch).toHaveBeenCalledWith("/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topics: ["VALE3"] }),
      });
    });
  });
});
