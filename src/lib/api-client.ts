export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const GENERIC_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";

/** Cliente HTTP das telas. Envia e recebe JSON e normaliza o erro padrão da API. */
export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
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
    );
  }

  return payload as T;
}
