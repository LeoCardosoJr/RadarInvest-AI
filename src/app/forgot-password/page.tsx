"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage, SubmitButton, TextField } from "@/components/auth/form-controls";
import { ApiError, postJson } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await postJson<{ message: string }>("/auth/forgot-password", {
        email: formData.get("email"),
      });

      // A mesma confirmação aparece exista ou não a conta.
      setMessage(result.message);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : "Não foi possível enviar a solicitação.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Recuperar senha"
      description="Informe o e-mail da conta. Se ele estiver cadastrado, enviaremos um link de uso único."
      footer={
        <Link href="/login" className="font-semibold text-[color:var(--accent-hover)]">
          Voltar para o login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        {message ? <FormMessage tone="success">{message}</FormMessage> : null}
        <TextField
          id="email"
          name="email"
          type="email"
          label="E-mail"
          autoComplete="email"
          required
        />
        <SubmitButton pending={pending}>Enviar instruções</SubmitButton>
      </form>
    </AuthCard>
  );
}
