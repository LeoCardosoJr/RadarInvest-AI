"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage, SubmitButton, TextField } from "@/components/auth/form-controls";
import { ApiError, postJson } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      await postJson("/auth/register", {
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      });

      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : "Não foi possível concluir o cadastro.",
      );
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Criar conta"
      description="Cadastre-se para acompanhar as notícias que importam para você."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-emerald-300">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <TextField
          id="name"
          name="name"
          label="Nome"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          hint="Mínimo de 8 caracteres."
        />
        <SubmitButton pending={pending}>Criar conta</SubmitButton>
      </form>
    </AuthCard>
  );
}
