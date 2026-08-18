import { createTransport } from "nodemailer";

import type { MailMessage, MailTransport } from "./mail-transport";

export interface SmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}

/** Única fronteira do projeto que importa o SDK de e-mail. */
export class NodemailerMailTransport implements MailTransport {
  private readonly transporter: ReturnType<typeof createTransport>;

  constructor(config: SmtpTransportConfig) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user && config.password ? { user: config.user, pass: config.password } : undefined,
    });
  }

  async sendMail(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      to: message.to,
      from: message.from,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
