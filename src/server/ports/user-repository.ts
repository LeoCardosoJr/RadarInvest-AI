export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface UserCredentials {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  tokenVersion: number;
  createdAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

export interface UserRepository {
  /** Único método que expõe passwordHash; usado exclusivamente pelo AuthService. */
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;

  findPublicById(id: string): Promise<PublicUser | null>;

  findTokenVersionById(id: string): Promise<number | null>;

  /** `null` quando a unique constraint de e-mail rejeita o insert (cadastro concorrente). */
  create(input: CreateUserInput): Promise<PublicUser | null>;
}
