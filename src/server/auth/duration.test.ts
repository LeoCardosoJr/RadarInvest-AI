import { describe, expect, it } from "vitest";

import { parseDurationToSeconds } from "./duration";

describe("parseDurationToSeconds", () => {
  it("converts the supported units", () => {
    expect(parseDurationToSeconds("45s")).toBe(45);
    expect(parseDurationToSeconds("30m")).toBe(1_800);
    expect(parseDurationToSeconds("1h")).toBe(3_600);
    expect(parseDurationToSeconds("7d")).toBe(604_800);
  });

  it("accepts plain seconds", () => {
    expect(parseDurationToSeconds("900")).toBe(900);
  });

  it("rejects unusable durations", () => {
    expect(() => parseDurationToSeconds("0h")).toThrow(/positive/);
    expect(() => parseDurationToSeconds("1 week")).toThrow(/Invalid duration/);
    expect(() => parseDurationToSeconds("")).toThrow(/Invalid duration/);
  });
});
