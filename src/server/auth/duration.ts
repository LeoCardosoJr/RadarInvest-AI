const DURATION_PATTERN = /^(\d+)\s*(s|m|h|d)$/i;

const UNIT_IN_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3_600,
  d: 86_400,
};

/**
 * Converte `JWT_EXPIRES_IN` ("30m", "1h", "7d" ou segundos puros) em segundos.
 * A expiração do cookie de sessão é derivada do mesmo valor, mantendo sessão
 * web e JWT alinhados.
 */
export function parseDurationToSeconds(value: string): number {
  const normalized = value.trim();

  if (/^\d+$/.test(normalized)) {
    const seconds = Number(normalized);

    if (seconds <= 0) {
      throw new Error("Duration must be positive.");
    }

    return seconds;
  }

  const match = DURATION_PATTERN.exec(normalized);

  if (!match) {
    throw new Error(`Invalid duration: use seconds or a value such as "30m", "1h" or "7d".`);
  }

  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();

  if (amount <= 0) {
    throw new Error("Duration must be positive.");
  }

  return amount * UNIT_IN_SECONDS[unit]!;
}
