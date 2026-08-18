import type { InputHTMLAttributes } from "react";

export function TextField({
  label,
  id,
  hint,
  ...inputProps
}: { label: string; id: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-2 text-xs text-slate-500">
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
      className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
    >
      {pending ? "Aguarde…" : children}
    </button>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: string }) {
  const toneClasses =
    tone === "error"
      ? "border-red-900/60 bg-red-950/40 text-red-200"
      : "border-emerald-900/60 bg-emerald-950/40 text-emerald-200";

  return (
    <p role="status" className={`mb-5 rounded-lg border px-3 py-2 text-sm ${toneClasses}`}>
      {children}
    </p>
  );
}
