export const SESSION_COOKIE_NAME = "radarinvest_session";

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAge: number;
}

export interface SessionCookie {
  name: string;
  value: string;
  options: SessionCookieOptions;
}

export interface SessionCookieConfig {
  secure: boolean;
  maxAgeSeconds: number;
}

/**
 * Cookie de sessão da interface web.
 *
 * `HttpOnly` mantém o JWT fora do JavaScript da página, `SameSite=Lax` limita o
 * envio em requisições de terceiros e `maxAge` acompanha a expiração do próprio
 * token, para que sessão web e JWT terminem juntos.
 */
export function buildSessionCookie(
  accessToken: string,
  config: SessionCookieConfig,
): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: accessToken,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: config.secure,
      maxAge: config.maxAgeSeconds,
    },
  };
}

/** Cookie de expiração imediata usado no logout. */
export function buildClearedSessionCookie(config: { secure: boolean }): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: config.secure,
      maxAge: 0,
    },
  };
}

/**
 * Lê o cookie de sessão do header bruto, sem depender do framework HTTP.
 *
 * O valor é sempre um JWT (charset base64url), que não contém caracteres a
 * decodificar — devolve o valor bruto em vez de arriscar um `URIError` em
 * `decodeURIComponent` para um header malformado.
 */
export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    if (part.slice(0, separatorIndex).trim() === SESSION_COOKIE_NAME) {
      return part.slice(separatorIndex + 1).trim() || null;
    }
  }

  return null;
}
