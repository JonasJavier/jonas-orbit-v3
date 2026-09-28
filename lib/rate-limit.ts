/**
 * Límite de tasa en el propio proceso para los endpoints públicos.
 *
 * Producción corre en Railway con un solo `next start`: la regla de
 * `infra/cloudflare/` no protege ese origen, así que el formulario replica aquí
 * su contrato (5 envíos por minuto e IP, bloqueo de 10 minutos). El estado vive
 * en memoria: con una réplica es exacto; con varias, cada una cuenta aparte y el
 * límite efectivo se multiplica por el número de réplicas.
 */

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type Entry = { hits: number[]; blockedUntil: number };

export function createRateLimiter({
  limit,
  windowMs,
  blockMs,
  maxKeys = 10_000,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  blockMs: number;
  /** Tope de claves en memoria: se descarta la menos reciente. */
  maxKeys?: number;
  now?: () => number;
}) {
  const entries = new Map<string, Entry>();

  function remember(key: string, entry: Entry) {
    // Reinsertar mantiene el Map ordenado de menos a más reciente.
    entries.delete(key);
    entries.set(key, entry);
    while (entries.size > maxKeys) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }

  return {
    consume(key: string): RateLimitDecision {
      const time = now();
      const entry = entries.get(key);

      if (entry && entry.blockedUntil > time) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((entry.blockedUntil - time) / 1000),
        };
      }

      const hits = (entry?.hits ?? []).filter((hit) => time - hit < windowMs);
      hits.push(time);

      if (hits.length > limit) {
        remember(key, { hits: [], blockedUntil: time + blockMs });
        return { allowed: false, retryAfterSeconds: Math.ceil(blockMs / 1000) };
      }

      remember(key, { hits, blockedUntil: 0 });
      return { allowed: true };
    },
  };
}

/**
 * IP del visitante. `x-real-ip` la escribe el borde de Railway;
 * `cf-connecting-ip`, Cloudflare (preview de OpenNext). `x-forwarded-for`
 * queda como último recurso porque el cliente puede anteponer valores.
 */
export function clientAddress(headers: Headers): string | undefined {
  for (const name of ["x-real-ip", "cf-connecting-ip"]) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}
