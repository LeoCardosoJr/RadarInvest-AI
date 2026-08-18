import type { FeedItem } from "@/lib/feed";

interface FeedCardProps {
  item: FeedItem;
}

export function FeedCard({ item }: FeedCardProps) {
  return (
    <article className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-700 hover:bg-slate-900/90">
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-md border border-emerald-900/60 bg-emerald-950/50 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
            {item.source}
          </span>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 rounded"
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

        <h3 className="mt-3 text-base font-semibold leading-snug tracking-tight text-white group-hover:text-emerald-100">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-400/40 rounded"
          >
            {item.title}
          </a>
        </h3>

        <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{item.summary}</p>
      </div>
    </article>
  );
}
