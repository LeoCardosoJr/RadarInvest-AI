import { z } from "zod";

import { MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH } from "./password-policy";

const nameSchema = z.string().trim().min(2).max(120);

/** O e-mail é normalizado aqui; consulta e persistência usam sempre esta forma. */
const emailSchema = z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(320));

/**
 * O limite superior é medido em bytes porque o bcrypt trunca a partir de 72;
 * rejeitar é preferível a aceitar uma senha silenciosamente encurtada.
 */
const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH)
  .refine((password) => Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES, {
    message: `Password must have at most ${MAX_PASSWORD_BYTES} bytes.`,
  });

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1).max(512),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
