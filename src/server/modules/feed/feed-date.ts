/** Data lógica do feed no fuso configurado (`America/Sao_Paulo` por padrão), formato `YYYY-MM-DD`. */
export function currentCacheDate(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
