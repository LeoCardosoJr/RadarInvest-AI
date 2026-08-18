/** `code`/`message` são públicos; nenhuma instância carrega hash, token, senha ou SQL. */
export type AppErrorDetails = Record<string, string>;

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: AppErrorDetails;

  constructor(
    code: string,
    status: number,
    message: string,
    options?: { details?: AppErrorDetails; cause?: unknown },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = options?.details;
  }
}

export class ValidationError extends AppError {
  constructor(details?: AppErrorDetails) {
    super("VALIDATION_ERROR", 400, "Dados inválidos.", { details });
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("UNAUTHORIZED", 401, "Autenticação obrigatória.");
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super("INVALID_CREDENTIALS", 401, "E-mail ou senha inválidos.");
  }
}

export class AccountAlreadyExistsError extends AppError {
  constructor() {
    super("ACCOUNT_ALREADY_EXISTS", 409, "Já existe uma conta para este e-mail.");
  }
}

export class InvalidPasswordResetTokenError extends AppError {
  constructor() {
    super("INVALID_RESET_TOKEN", 400, "Link de recuperação inválido ou expirado.");
  }
}

export class InternalError extends AppError {
  constructor(cause?: unknown) {
    super("INTERNAL_ERROR", 500, "Não foi possível concluir a operação.", { cause });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
