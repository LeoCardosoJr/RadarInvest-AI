import { SignJWT, jwtVerify } from "jose";

import type { AuthContext, IssuedAccessToken, JwtService } from "../../auth/jwt-service";

/** Fixado na aplicação; o header do token recebido nunca escolhe o algoritmo. */
const ALGORITHM = "HS256";

/** Claim com a versão de sessão do usuário, usada para revogar tokens antigos. */
const TOKEN_VERSION_CLAIM = "ver";

export interface JoseJwtServiceConfig {
  secret: string;
  issuer: string;
  audience: string;
  expiresInSeconds: number;
}

export class JoseJwtService implements JwtService {
  private readonly secret: Uint8Array;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly expiresInSeconds: number;

  constructor(config: JoseJwtServiceConfig) {
    if (config.secret.length < 32) {
      throw new Error("JWT secret must have at least 32 characters.");
    }

    if (!Number.isInteger(config.expiresInSeconds) || config.expiresInSeconds <= 0) {
      throw new Error("JWT expiration must be a positive number of seconds.");
    }

    this.secret = new TextEncoder().encode(config.secret);
    this.issuer = config.issuer;
    this.audience = config.audience;
    this.expiresInSeconds = config.expiresInSeconds;
  }

  async issueAccessToken(subject: {
    userId: string;
    tokenVersion: number;
  }): Promise<IssuedAccessToken> {
    const issuedAtSeconds = Math.floor(Date.now() / 1000);
    const expiresAtSeconds = issuedAtSeconds + this.expiresInSeconds;

    const accessToken = await new SignJWT({ [TOKEN_VERSION_CLAIM]: subject.tokenVersion })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(subject.userId)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setIssuedAt(issuedAtSeconds)
      .setExpirationTime(expiresAtSeconds)
      .sign(this.secret);

    return {
      accessToken,
      expiresAt: new Date(expiresAtSeconds * 1000),
    };
  }

  async verifyAccessToken(token: string): Promise<AuthContext | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: [ALGORITHM],
        issuer: this.issuer,
        audience: this.audience,
        requiredClaims: ["sub", "iss", "aud", "iat", "exp"],
      });

      const tokenVersion = payload[TOKEN_VERSION_CLAIM];

      if (!payload.sub || !Number.isInteger(tokenVersion)) {
        return null;
      }

      return { userId: payload.sub, tokenVersion: tokenVersion as number };
    } catch {
      return null;
    }
  }
}
