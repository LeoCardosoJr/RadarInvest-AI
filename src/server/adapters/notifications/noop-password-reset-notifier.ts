import type { PasswordResetNotifier } from "../../ports/password-reset-notifier";

/** Usado quando o SMTP não está configurado: nenhuma mensagem é entregue. */
export class NoopPasswordResetNotifier implements PasswordResetNotifier {
  async notifyPasswordReset(): Promise<void> {}
}
