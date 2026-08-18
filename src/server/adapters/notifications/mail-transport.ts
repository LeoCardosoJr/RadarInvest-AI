/**
 * Fronteira mínima de envio de e-mail.
 *
 * O notifier depende apenas desta interface; o SDK concreto é instanciado
 * somente no composition root e substituído por um stub nos testes.
 */
export interface MailMessage {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailTransport {
  sendMail(message: MailMessage): Promise<void>;
}
