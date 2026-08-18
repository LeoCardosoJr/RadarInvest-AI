export interface AuthContext {
  userId: string;
  tokenVersion: number;
}

export interface IssuedAccessToken {
  accessToken: string;
  expiresAt: Date;
}

export interface JwtService {
  issueAccessToken(subject: { userId: string; tokenVersion: number }): Promise<IssuedAccessToken>;

  /** `null` para qualquer token inválido, expirado ou não confiável. */
  verifyAccessToken(token: string): Promise<AuthContext | null>;
}
