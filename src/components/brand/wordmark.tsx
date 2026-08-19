/**
 * Marca do produto: selo sólido com ícone de radar (dial + varredura +
 * "sinal" detectado, referência literal ao nome) — não uma linha fina
 * perdida ao lado do texto — seguido de wordmark sans bold com tracking
 * apertado e um selo mono "AI". Sem gradiente, sem serifa.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color:var(--accent-solid)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8" stroke="#09090b" strokeWidth="1.8" />
          <line
            x1="12"
            y1="12"
            x2="17.5"
            y2="6.5"
            stroke="#09090b"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="7" cy="16" r="1.6" fill="#09090b" />
        </svg>
      </span>
      <span className="text-base font-extrabold tracking-tight text-zinc-50">RadarInvest</span>
      <span className="rounded-sm border border-[color:var(--accent-soft-border)] bg-[color:var(--accent-soft-bg)] px-1 py-0.5 font-mono text-[10px] font-semibold uppercase leading-none tracking-wide text-[color:var(--accent)]">
        AI
      </span>
    </span>
  );
}
