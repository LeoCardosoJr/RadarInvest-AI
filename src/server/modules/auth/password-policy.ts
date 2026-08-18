/** Compartilhado entre o schema de entrada e o adapter de hash; nenhum depende do outro. */
export const MIN_PASSWORD_LENGTH = 8;

/** bcrypt ignora silenciosamente o que passa de 72 bytes; o limite é explícito. */
export const MAX_PASSWORD_BYTES = 72;
