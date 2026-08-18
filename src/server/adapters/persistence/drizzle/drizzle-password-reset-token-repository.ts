import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import type { Database } from "../../../db/client";
import { passwordResetTokens, users } from "../../../db/schema";
import type {
  CompletedPasswordReset,
  CompletePasswordResetInput,
  IssueTokenIfAllowedInput,
  PasswordResetTokenRepository,
} from "../../../ports/password-reset-token-repository";

export class DrizzlePasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly db: Database) {}

  /**
   * `FOR UPDATE` na linha do usuário serializa solicitações concorrentes: a
   * segunda transação só lê o cooldown depois que a primeira confirma, então
   * nunca decide com o estado obsoleto que produziria dois tokens ativos.
   */
  async issueTokenIfAllowed(input: IssueTokenIfAllowedInput): Promise<boolean> {
    return this.db.transaction(async (transaction) => {
      await transaction.select().from(users).where(eq(users.id, input.userId)).for("update");

      const [lastToken] = await transaction
        .select({ createdAt: passwordResetTokens.createdAt })
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, input.userId))
        .orderBy(desc(passwordResetTokens.createdAt))
        .limit(1);

      if (lastToken) {
        const elapsedSeconds = (input.now.getTime() - lastToken.createdAt.getTime()) / 1000;

        if (elapsedSeconds < input.cooldownSeconds) {
          return false;
        }
      }

      await transaction
        .update(passwordResetTokens)
        .set({ usedAt: input.now })
        .where(
          and(eq(passwordResetTokens.userId, input.userId), isNull(passwordResetTokens.usedAt)),
        );

      await transaction.insert(passwordResetTokens).values({
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      });

      return true;
    });
  }

  /**
   * Consumo do token e troca de senha na mesma transação: se a atualização do
   * usuário falhar, o rollback também desfaz o consumo do token.
   */
  async completePasswordReset(
    input: CompletePasswordResetInput,
  ): Promise<CompletedPasswordReset | null> {
    return this.db.transaction(async (transaction) => {
      const [consumedToken] = await transaction
        .update(passwordResetTokens)
        .set({ usedAt: input.now })
        .where(
          and(
            eq(passwordResetTokens.tokenHash, input.tokenHash),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, input.now),
          ),
        )
        .returning({ userId: passwordResetTokens.userId });

      if (!consumedToken) {
        return null;
      }

      const [updatedUser] = await transaction
        .update(users)
        .set({
          passwordHash: input.passwordHash,
          // Invalida todos os JWTs emitidos antes desta troca de senha.
          tokenVersion: sql`${users.tokenVersion} + 1`,
        })
        .where(eq(users.id, consumedToken.userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
          tokenVersion: users.tokenVersion,
        });

      if (!updatedUser) {
        throw new Error("Password reset target user no longer exists.");
      }

      await transaction
        .update(passwordResetTokens)
        .set({ usedAt: input.now })
        .where(
          and(
            eq(passwordResetTokens.userId, consumedToken.userId),
            isNull(passwordResetTokens.usedAt),
          ),
        );

      return {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          createdAt: updatedUser.createdAt,
        },
        tokenVersion: updatedUser.tokenVersion,
      };
    });
  }
}
