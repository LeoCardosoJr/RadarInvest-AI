import { describe, expect, it } from "vitest";

import { currentCacheDate } from "./feed-date";

describe("currentCacheDate", () => {
  it("usa a data local do fuso informado, não a data UTC", () => {
    // 2026-08-18T02:30:00Z ainda é 2026-08-17 à noite em São Paulo (UTC-3).
    const now = new Date("2026-08-18T02:30:00Z");

    expect(currentCacheDate("America/Sao_Paulo", now)).toBe("2026-08-17");
    expect(currentCacheDate("UTC", now)).toBe("2026-08-18");
  });

  it("avança a data lógica assim que o dia local vira", () => {
    // 2026-08-18T04:00:00Z já é 2026-08-18 à 01h em São Paulo.
    const now = new Date("2026-08-18T04:00:00Z");

    expect(currentCacheDate("America/Sao_Paulo", now)).toBe("2026-08-18");
  });
});
