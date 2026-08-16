import { describe, expect, it } from "vitest";

import { normalizeEmail, normalizeTopic, parseSeedInterests } from "./seed-service";

describe("seed normalization", () => {
  it("normalizes email with trim and lowercase", () => {
    expect(normalizeEmail("  Demo@RadarInvest.Local ")).toBe("demo@radarinvest.local");
  });

  it("normalizes topic whitespace and case", () => {
    expect(normalizeTopic("  Taxa   SELIC ")).toBe("taxa selic");
  });

  it("deduplicates interests by their normalized value", () => {
    expect(parseSeedInterests("PETR4, petr4, taxa   Selic, VALE3")).toEqual([
      { topic: "PETR4", normalizedTopic: "petr4" },
      { topic: "taxa Selic", normalizedTopic: "taxa selic" },
      { topic: "VALE3", normalizedTopic: "vale3" },
    ]);
  });

  it("rejects topics above the persisted limit", () => {
    expect(() => parseSeedInterests("a".repeat(81))).toThrow(/at most 80 characters/);
  });

  it("rejects more interests than the product limit", () => {
    const topics = Array.from({ length: 21 }, (_, index) => `topic-${index}`).join(",");

    expect(() => parseSeedInterests(topics)).toThrow(/at most 20 interests/);
  });
});
