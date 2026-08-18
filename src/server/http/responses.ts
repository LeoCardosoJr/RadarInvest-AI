import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildSessionCookie,
  type SessionCookie,
  type SessionCookieConfig,
} from "../auth/session-cookie";
import { AppError, ValidationError, isAppError } from "../errors/app-error";
import type { AuthenticatedSession } from "../modules/auth/auth-service";

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export function errorResponse(error: AppError): NextResponse<ErrorBody> {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    },
    { status: error.status },
  );
}

/**
 * Traduz qualquer falha em resposta pública. Erros desconhecidos viram
 * `INTERNAL_ERROR`: stack, SQL e mensagens de provider nunca chegam ao cliente.
 */
export function toErrorResponse(error: unknown): NextResponse<ErrorBody> {
  if (isAppError(error)) {
    return errorResponse(error);
  }

  console.error("Unhandled route error.", error instanceof Error ? error.name : "UnknownError");

  return errorResponse(
    new AppError("INTERNAL_ERROR", 500, "Não foi possível concluir a operação."),
  );
}

export function withSessionCookie<T>(
  response: NextResponse<T>,
  cookie: SessionCookie,
): NextResponse<T> {
  response.cookies.set(cookie.name, cookie.value, cookie.options);

  return response;
}

export interface SessionResponseBody {
  user: AuthenticatedSession["user"];
  accessToken: string;
  expiresAt: string;
}

/** JSON + cookie de sessão; usado por cadastro, login e conclusão do reset. */
export function sessionResponse(
  session: AuthenticatedSession,
  cookieConfig: SessionCookieConfig,
  status = 200,
): NextResponse<SessionResponseBody> {
  const response = NextResponse.json<SessionResponseBody>(
    {
      user: session.user,
      accessToken: session.accessToken,
      expiresAt: session.expiresAt.toISOString(),
    },
    { status },
  );

  return withSessionCookie(response, buildSessionCookie(session.accessToken, cookieConfig));
}

/** Converte o primeiro problema do Zod em `details` seguro para exposição. */
export function validationErrorFrom(error: z.ZodError): ValidationError {
  const [issue] = error.issues;

  return new ValidationError(issue ? { field: issue.path.join(".") || "body" } : undefined);
}

export async function parseJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new ValidationError({ field: "body" });
  }

  const result = schema.safeParse(payload);

  if (!result.success) {
    throw validationErrorFrom(result.error);
  }

  return result.data;
}
