import type {
  PasswordResetNotification,
  PasswordResetNotifier,
} from "../../ports/password-reset-notifier";
import type { MailTransport } from "./mail-transport";

export interface SmtpPasswordResetNotifierConfig {
  appUrl: string;
  fromEmail: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class SmtpPasswordResetNotifier implements PasswordResetNotifier {
  constructor(
    private readonly transport: MailTransport,
    private readonly config: SmtpPasswordResetNotifierConfig,
  ) {}

  async notifyPasswordReset(notification: PasswordResetNotification): Promise<void> {
    const resetUrl = this.buildResetUrl(notification.token);
    const expiresAtLabel = notification.expiresAt.toISOString();

    // O corpo é a única saída que contém o token; ele não passa por logs.
    await this.transport.sendMail({
      to: notification.email,
      from: this.config.fromEmail,
      subject: "Recuperação de senha — RadarInvest AI",
      text: [
        `Olá, ${notification.name}.`,
        "",
        "Recebemos uma solicitação para redefinir a sua senha no RadarInvest AI.",
        "Abra o link abaixo para escolher uma nova senha:",
        resetUrl,
        "",
        `O link é de uso único e expira em ${expiresAtLabel}.`,
        "Se você não fez esta solicitação, ignore esta mensagem.",
      ].join("\n"),
      html: [
        `<p>Olá, ${escapeHtml(notification.name)}.</p>`,
        "<p>Recebemos uma solicitação para redefinir a sua senha no RadarInvest AI.</p>",
        `<p><a href="${escapeHtml(resetUrl)}">Escolher uma nova senha</a></p>`,
        `<p>O link é de uso único e expira em ${escapeHtml(expiresAtLabel)}.</p>`,
        "<p>Se você não fez esta solicitação, ignore esta mensagem.</p>",
      ].join(""),
    });
  }

  private buildResetUrl(token: string): string {
    const url = new URL("/reset-password", this.config.appUrl);
    url.searchParams.set("token", token);

    return url.toString();
  }
}
