"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage, SubmitButton, TextField } from "@/components/auth/form-controls";
import { ApiError, postJson } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      await postJson("/auth/login", {
        email: formData.get("email"),
        password: formData.get("password"),
      });

      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Não foi possível entrar.");
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Entrar"
      description="Acesse sua conta para ver o seu radar de notícias."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/register" className="font-semibold text-[color:var(--accent-hover)]">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <TextField
          id="email"
          name="email"
          type="email"
          label="E-mail"
          autoComplete="email"
          required
        />
        <TextField
          id="password"
          name="password"
          type="password"
          label="Senha"
          autoComplete="current-password"
          required
        />
        <SubmitButton pending={pending}>Entrar</SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-zinc-400 hover:text-[color:var(--accent-hover)]"
        >
          Esqueci minha senha
        </Link>
      </p>
    </AuthCard>
  );
}
