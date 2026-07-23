/**
 * Limite de tentativas de login (anti força-bruta), por janela deslizante.
 *
 * Guardado em memória do processo. Em serverless (Vercel) isso é best-effort:
 * cada instância tem seu próprio contador e some no cold start — ainda assim
 * segura rajadas de tentativas na mesma instância quente, que é o caso comum.
 * Para garantia forte entre instâncias, migrar para Postgres/Redis (ver TODO).
 */
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 5

const buckets = new Map<string, number[]>()

function prune(key: string, now: number): number[] {
  const recent = (buckets.get(key) ?? []).filter((time) => now - time < WINDOW_MS)
  if (recent.length) {
    buckets.set(key, recent)
  } else {
    buckets.delete(key)
  }
  return recent
}

export function isRateLimited(key: string): { limited: boolean; retryAfterSec: number } {
  const now = Date.now()
  const recent = prune(key, now)

  if (recent.length >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000))
    return { limited: true, retryAfterSec }
  }

  return { limited: false, retryAfterSec: 0 }
}

/** Registra uma tentativa falha na janela. */
export function recordFailure(key: string): void {
  const now = Date.now()
  const recent = prune(key, now)
  recent.push(now)
  buckets.set(key, recent)
}

/** Zera o contador (chamado ao autenticar com sucesso). */
export function clearAttempts(key: string): void {
  buckets.delete(key)
}

/** IP do cliente atrás do proxy da Vercel (ou do dev-server). */
export function clientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress ?? 'desconhecido'
}
