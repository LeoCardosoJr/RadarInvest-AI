import type { InputHTMLAttributes } from "react";

export function TextField({
  label,
  id,
  hint,
  ...inputProps
}: { label: string; id: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-ring)]"
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  pending,
  disabled,
  children,
}: {
  pending: boolean;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded bg-[color:var(--accent-solid)] px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-[color:var(--accent-solid-hover)] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
    >
      {pending ? "Aguarde…" : children}
    </button>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: string }) {
  const toneClasses =
    tone === "error"
      ? "border-red-900/60 bg-red-950/40 text-red-300"
      : "border-[color:var(--accent-soft-border)] bg-[color:var(--accent-soft-bg)] text-[color:var(--accent-hover)]";

  return (
    <p role="status" className={`mb-4 rounded border px-3 py-2 text-sm ${toneClasses}`}>
      {children}
    </p>
  );
}
