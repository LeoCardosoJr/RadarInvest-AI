import { describe, expect, it } from "vitest";

import { MAX_PASSWORD_BYTES } from "../../modules/auth/password-policy";
import { BcryptjsPasswordHasher } from "./bcryptjs-password-hasher";

const hasher = new BcryptjsPasswordHasher(10);

describe("BcryptjsPasswordHasher", () => {
  it("never produces a hash equal to the password", async () => {
    const password = "senha-segura-123";
    const passwordHash = await hasher.hash(password);

    expect(passwordHash).not.toBe(password);
    expect(passwordHash).not.toContain(password);
  });

  it("produces different hashes for the same password", async () => {
    const [first, second] = await Promise.all([
      hasher.hash("senha-segura"),
      hasher.hash("senha-segura"),
    ]);

    expect(first).not.toBe(second);
  });

  it("accepts the correct password and rejects the wrong one", async () => {
    const passwordHash = await hasher.hash("senha-correta");

    expect(await hasher.verify("senha-correta", passwordHash)).toBe(true);
    expect(await hasher.verify("senha-errada", passwordHash)).toBe(false);
  });

  it("rejects an invalid cost during construction", () => {
    expect(() => new BcryptjsPasswordHasher(4)).toThrow(/between 10 and 16/);
    expect(() => new BcryptjsPasswordHasher(20)).toThrow(/between 10 and 16/);
    expect(() => new BcryptjsPasswordHasher(10.5)).toThrow(/between 10 and 16/);
  });

  it("refuses passwords longer than the bcrypt limit instead of truncating them", async () => {
    const oversized = "a".repeat(MAX_PASSWORD_BYTES + 1);

    await expect(hasher.hash(oversized)).rejects.toThrow(/at most 72 bytes/);
  });

  it("measures the limit in bytes, not characters", async () => {
    // Cada emoji ocupa 4 bytes em UTF-8.
    const multiByte = "😀".repeat(19);

    expect(multiByte.length).toBeLessThan(MAX_PASSWORD_BYTES);
    await expect(hasher.hash(multiByte)).rejects.toThrow(/at most 72 bytes/);
  });

  it("reuses a single dummy hash for the unknown-email path", async () => {
    const [first, second] = await Promise.all([hasher.dummyHash(), hasher.dummyHash()]);

    expect(first).toBe(second);
    expect(await hasher.verify("qualquer-senha", first)).toBe(false);
  });
});
