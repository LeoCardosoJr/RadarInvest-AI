import { UnauthorizedError } from "../errors/app-error";
import type { UserRepository } from "../ports/user-repository";
import type { AuthContext, JwtService } from "./jwt-service";
import { readSessionCookie } from "./session-cookie";

export interface AuthenticationDependencies {
  jwtService: JwtService;
  userRepository: UserRepository;
}

const BEARER_PREFIX = "bearer ";

/** Só o header Authorization e o cookie de sessão; body/query/headers custom são ignorados. */
export function extractAccessToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (authorization && authorization.toLowerCase().startsWith(BEARER_PREFIX)) {
    const token = authorization.slice(BEARER_PREFIX.length).trim();

    if (token) {
      return token;
    }
  }

  return readSessionCookie(request.headers.get("cookie"));
}

/** Valida assinatura e versão de sessão; token anterior a uma troca de senha é rejeitado. */
export async function authenticateAccessToken(
  token: string | null,
  dependencies: AuthenticationDependencies,
): Promise<AuthContext | null> {
  if (!token) {
    return null;
  }

  const context = await dependencies.jwtService.verifyAccessToken(token);

  if (!context) {
    return null;
  }

  const currentTokenVersion = await dependencies.userRepository.findTokenVersionById(
    context.userId,
  );

  if (currentTokenVersion === null || currentTokenVersion !== context.tokenVersion) {
    return null;
  }

  return context;
}

export async function authenticateRequest(
  request: Request,
  dependencies: AuthenticationDependencies,
): Promise<AuthContext | null> {
  return authenticateAccessToken(extractAccessToken(request), dependencies);
}

export async function requireAuthenticatedUser(
  request: Request,
  dependencies: AuthenticationDependencies,
): Promise<AuthContext> {
  const context = await authenticateRequest(request, dependencies);

  if (!context) {
    throw new UnauthorizedError();
  }

  return context;
}
