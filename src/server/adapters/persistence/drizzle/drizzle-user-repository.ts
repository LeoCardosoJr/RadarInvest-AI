import { eq } from "drizzle-orm";

import type { Database } from "../../../db/client";
import { users } from "../../../db/schema";
import type {
  CreateUserInput,
  PublicUser,
  UserCredentials,
  UserRepository,
} from "../../../ports/user-repository";

/** Projeção pública: nenhuma coluna de hash é selecionada. */
const publicColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  createdAt: users.createdAt,
};

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    const [user] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        tokenVersion: users.tokenVersion,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ?? null;
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const [user] = await this.db.select(publicColumns).from(users).where(eq(users.id, id)).limit(1);

    return user ?? null;
  }

  async findTokenVersionById(id: string): Promise<number | null> {
    const [user] = await this.db
      .select({ tokenVersion: users.tokenVersion })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user?.tokenVersion ?? null;
  }

  /**
   * A unique constraint de e-mail é a autoridade sobre duplicidade: dois
   * cadastros simultâneos resultam em exatamente uma linha, e o perdedor
   * recebe `null` sem erro de banco vazando para a rota.
   */
  async create(input: CreateUserInput): Promise<PublicUser | null> {
    const [created] = await this.db
      .insert(users)
      .values(input)
      .onConflictDoNothing({ target: users.email })
      .returning(publicColumns);

    return created ?? null;
  }
}
