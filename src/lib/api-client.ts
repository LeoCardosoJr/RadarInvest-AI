import type { FeedResponse } from "./feed";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const GENERIC_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";

async function requestJson<T>(
  path: string,
  method: "GET" | "POST" | "PUT",
  body?: unknown,
): Promise<T> {
  let response: Response;

  try {
    const options: RequestInit = {
      method,
      headers: { "content-type": "application/json" },
    };

    if (body !== undefined && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    response = await fetch(path, options);
  } catch {
    throw new ApiError("NETWORK_ERROR", "Falha de conexão. Verifique sua rede e tente novamente.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const errorBody = payload as ApiErrorBody | undefined;

    throw new ApiError(
      errorBody?.error?.code ?? "INTERNAL_ERROR",
      errorBody?.error?.message ?? GENERIC_MESSAGE,
      errorBody?.error?.details,
    );
  }

  return payload as T;
}

/** Cliente HTTP das telas. Envia e recebe JSON e normaliza o erro padrão da API. */
export async function getJson<T>(path: string): Promise<T> {
  return requestJson<T>(path, "GET");
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  return requestJson<T>(path, "POST", body);
}

export async function putJson<T>(path: string, body?: unknown): Promise<T> {
  return requestJson<T>(path, "PUT", body);
}

export async function getFeed(): Promise<FeedResponse> {
  return getJson<FeedResponse>("/feed");
}

export async function refreshFeed(): Promise<FeedResponse> {
  return postJson<FeedResponse>("/feed/refresh");
}
