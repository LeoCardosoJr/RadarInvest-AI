import type { PublicUser } from "./user-repository";

export interface IssueTokenIfAllowedInput {
  userId: string;
  /** Hash SHA-256 do token opaco, nunca o token em si. */
  tokenHash: string;
  expiresAt: Date;
  cooldownSeconds: number;
  now: Date;
}

export interface CompletePasswordResetInput {
  tokenHash: string;
  passwordHash: string;
  now: Date;
}

export interface CompletedPasswordReset {
  user: PublicUser;
  tokenVersion: number;
}

export interface PasswordResetTokenRepository {
  /**
   * Verifica o cooldown e cria o token em uma única operação atômica por
   * usuário (a checagem e a escrita não podem ser observadas separadamente
   * por duas solicitações concorrentes). Invalida os tokens ativos anteriores
   * quando cria o novo. Retorna `false` sem escrever nada se o cooldown ainda
   * estiver em vigor.
   */
  issueTokenIfAllowed(input: IssueTokenIfAllowedInput): Promise<boolean>;

  /**
   * Consome o token e troca a senha em uma única transação: se a atualização
   * do usuário falhar, o consumo do token é revertido junto. `null` cobre
   * token ausente, desconhecido, usado ou expirado. Invalida os demais tokens
   * do usuário e devolve a nova versão de sessão.
   */
  completePasswordReset(input: CompletePasswordResetInput): Promise<CompletedPasswordReset | null>;
}
