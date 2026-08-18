import { describe, expect, it } from "vitest";

import {
  SESSION_COOKIE_NAME,
  buildClearedSessionCookie,
  buildSessionCookie,
  readSessionCookie,
} from "./session-cookie";

describe("session cookie", () => {
  it("protects the session token and follows the JWT expiration", () => {
    const cookie = buildSessionCookie("jwt-token", { secure: true, maxAgeSeconds: 3_600 });

    expect(cookie.name).toBe(SESSION_COOKIE_NAME);
    expect(cookie.value).toBe("jwt-token");
    expect(cookie.options).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
      maxAge: 3_600,
    });
  });

  it("keeps Secure off outside production so the local HTTP session works", () => {
    expect(
      buildSessionCookie("jwt-token", { secure: false, maxAgeSeconds: 60 }).options.secure,
    ).toBe(false);
  });

  it("expires the cookie immediately on logout", () => {
    const cookie = buildClearedSessionCookie({ secure: true });

    expect(cookie.value).toBe("");
    expect(cookie.options.maxAge).toBe(0);
    expect(cookie.options.httpOnly).toBe(true);
  });

  it("reads the session cookie among other cookies", () => {
    expect(readSessionCookie(`theme=dark; ${SESSION_COOKIE_NAME}=jwt-token; locale=pt-BR`)).toBe(
      "jwt-token",
    );
  });

  it("returns null when the session cookie is absent or empty", () => {
    expect(readSessionCookie(null)).toBeNull();
    expect(readSessionCookie("theme=dark")).toBeNull();
    expect(readSessionCookie(`${SESSION_COOKIE_NAME}=`)).toBeNull();
  });
});
