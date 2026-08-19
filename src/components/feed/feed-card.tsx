import type { FeedItem } from "@/lib/feed";

interface FeedCardProps {
  item: FeedItem;
}

export function FeedCard({ item }: FeedCardProps) {
  return (
    <article className="group flex flex-col justify-between rounded border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700">
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-sm border border-[color:var(--accent-soft-border)] bg-[color:var(--accent-soft-bg)] px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-[color:var(--accent)]">
            {item.source}
          </span>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-[color:var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)] rounded"
            aria-label={`Ler notícia completa: ${item.title} (abre em nova aba)`}
          >
            <span>Ver notícia</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h4a.75.75 0 0 1 0 1.5h-4Z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>

        <h3 className="mt-2.5 text-sm font-semibold leading-snug tracking-tight text-zinc-50 group-hover:text-[color:var(--accent-hover)]">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)] rounded"
          >
            {item.title}
          </a>
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.summary}</p>
      </div>
    </article>
  );
}
