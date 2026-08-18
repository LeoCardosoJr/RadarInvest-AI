/** Implementações não podem registrar, imprimir ou devolver o token. */
export interface PasswordResetNotification {
  email: string;
  name: string;
  token: string;
  expiresAt: Date;
}

export interface PasswordResetNotifier {
  notifyPasswordReset(notification: PasswordResetNotification): Promise<void>;
}
