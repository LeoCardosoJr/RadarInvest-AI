/** Forma canônica do e-mail para consulta e persistência. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
