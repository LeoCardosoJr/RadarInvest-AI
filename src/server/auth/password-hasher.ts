export interface PasswordHasher {
  hash(password: string): Promise<string>;

  verify(password: string, passwordHash: string): Promise<boolean>;

  /** Hash descartável para o login com e-mail inexistente não ter caminho mais curto. */
  dummyHash(): Promise<string>;
}
