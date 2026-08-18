import { describe, expect, it } from "vitest";

import { formatFeedTimestamp } from "./feed";

describe("formatFeedTimestamp", () => {
  it("returns an empty string when date is null or invalid", () => {
    expect(formatFeedTimestamp(null)).toBe("");
    expect(formatFeedTimestamp("invalid-date")).toBe("");
    expect(formatFeedTimestamp("")).toBe("");
  });

  it("formats ISO date string into Brazilian date and time format", () => {
    // 2026-08-18T17:30:00Z corresponds to 14:30 in America/Sao_Paulo (UTC-3)
    const result = formatFeedTimestamp("2026-08-18T17:30:00.000Z");

    expect(result).toMatch(/18 de ago\.\s+de 2026 às 14:30|18\/08\/2026|18 de ago de 2026/);
    expect(result).toContain("14:30");
  });
});
