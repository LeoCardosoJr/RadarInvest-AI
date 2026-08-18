import { SignJWT, decodeJwt, decodeProtectedHeader } from "jose";
import { describe, expect, it } from "vitest";

import { JoseJwtService } from "./jose-jwt-service";

const SECRET = "a-secure-test-secret-with-at-least-32-characters";
const ISSUER = "radarinvest-ai";
const AUDIENCE = "radarinvest-web";

function createService(overrides?: {
  issuer?: string;
  audience?: string;
  expiresInSeconds?: number;
}) {
  return new JoseJwtService({
    secret: SECRET,
    issuer: overrides?.issuer ?? ISSUER,
    audience: overrides?.audience ?? AUDIENCE,
    expiresInSeconds: overrides?.expiresInSeconds ?? 3_600,
  });
}

const subject = { userId: "0f1c9a3c-6a2f-4f7e-8f1e-8f7b2f9a1c11", tokenVersion: 3 };

describe("JoseJwtService", () => {
  it("issues a token with sub, iss, aud, iat and exp", async () => {
    const service = createService();
    const { accessToken, expiresAt } = await service.issueAccessToken(subject);
    const claims = decodeJwt(accessToken);

    expect(claims.sub).toBe(subject.userId);
    expect(claims.iss).toBe(ISSUER);
    expect(claims.aud).toBe(AUDIENCE);
    expect(claims.iat).toBeTypeOf("number");
    expect(claims.exp).toBe(claims.iat! + 3_600);
    expect(expiresAt.getTime()).toBe(claims.exp! * 1000);
    expect(decodeProtectedHeader(accessToken).alg).toBe("HS256");
  });

  it("accepts its own token and exposes the session version", async () => {
    const service = createService();
    const { accessToken } = await service.issueAccessToken(subject);

    expect(await service.verifyAccessToken(accessToken)).toEqual({
      userId: subject.userId,
      tokenVersion: subject.tokenVersion,
    });
  });

  it("rejects a tampered signature", async () => {
    const service = createService();
    const { accessToken } = await service.issueAccessToken(subject);
    const [header, payload, signature] = accessToken.split(".");
    const tampered = `${header}.${payload}.${signature!.slice(0, -2)}xy`;

    expect(await service.verifyAccessToken(tampered)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({ ver: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(subject.userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7_200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3_600)
      .sign(new TextEncoder().encode(SECRET));

    expect(await createService().verifyAccessToken(expired)).toBeNull();
  });

  it("rejects a token signed for another issuer", async () => {
    const { accessToken } = await createService({ issuer: "outro-emissor" }).issueAccessToken(
      subject,
    );

    expect(await createService().verifyAccessToken(accessToken)).toBeNull();
  });

  it("rejects a token signed for another audience", async () => {
    const { accessToken } = await createService({ audience: "outra-audiencia" }).issueAccessToken(
      subject,
    );

    expect(await createService().verifyAccessToken(accessToken)).toBeNull();
  });

  it("rejects an unexpected algorithm even with a valid structure", async () => {
    // "none" e HMAC-SHA512 não são aceitos: o algoritmo é fixado na aplicação.
    const unsignedHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
      "base64url",
    );
    const payload = Buffer.from(
      JSON.stringify({
        sub: subject.userId,
        iss: ISSUER,
        aud: AUDIENCE,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3_600,
        ver: 0,
      }),
    ).toString("base64url");

    const hs512 = await new SignJWT({ ver: 0 })
      .setProtectedHeader({ alg: "HS512" })
      .setSubject(subject.userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));

    const service = createService();

    expect(await service.verifyAccessToken(`${unsignedHeader}.${payload}.`)).toBeNull();
    expect(await service.verifyAccessToken(hs512)).toBeNull();
  });

  it("rejects a token without the session version claim", async () => {
    const withoutVersion = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(subject.userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRET));

    expect(await createService().verifyAccessToken(withoutVersion)).toBeNull();
  });

  it("refuses to start with a weak secret or a non-positive expiration", () => {
    expect(
      () =>
        new JoseJwtService({
          secret: "curto-demais",
          issuer: ISSUER,
          audience: AUDIENCE,
          expiresInSeconds: 3_600,
        }),
    ).toThrow(/at least 32 characters/);

    expect(() => createService({ expiresInSeconds: 0 })).toThrow(/positive number of seconds/);
  });
});
