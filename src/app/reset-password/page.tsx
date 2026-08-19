"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage, SubmitButton, TextField } from "@/components/auth/form-controls";
import { ApiError, postJson } from "@/lib/api-client";

function ResetPasswordForm() {
  const router = useRouter();
  // O token chega pelo link do e-mail e nunca é exibido na tela.
  const token = useSearchParams().get("token") ?? "";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    if (password !== String(formData.get("passwordConfirmation") ?? "")) {
      setError("As senhas não conferem.");
      setPending(false);
      return;
    }

    try {
      await postJson("/auth/reset-password", { token, password });

      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : "Não foi possível redefinir a senha.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {!token ? (
        <FormMessage tone="error">
          Link de recuperação incompleto. Solicite um novo e-mail.
        </FormMessage>
      ) : null}
      <TextField
        id="password"
        name="password"
        type="password"
        label="Nova senha"
        autoComplete="new-password"
        required
        minLength={8}
        hint="Mínimo de 8 caracteres."
      />
      <TextField
        id="passwordConfirmation"
        name="passwordConfirmation"
        type="password"
        label="Confirmar nova senha"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <SubmitButton pending={pending} disabled={!token}>
        Redefinir senha
      </SubmitButton>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Definir nova senha"
      description="Escolha uma nova senha. O link é de uso único e encerra as sessões abertas anteriormente."
      footer={
        <Link href="/forgot-password" className="font-semibold text-[color:var(--accent-hover)]">
          Solicitar novo link
        </Link>
      }
    >
      <Suspense fallback={<p className="text-sm text-zinc-400">Carregando…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
