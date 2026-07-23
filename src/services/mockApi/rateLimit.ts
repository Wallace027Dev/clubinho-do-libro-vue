/**
 * Espelho do limitador de login do backend real (`api/_lib/rateLimit.ts`),
 * para o mock de homologação ter o mesmo comportamento anti força-bruta.
 * Como não há IP no navegador, a chave é o próprio login/alvo.
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

export function recordFailure(key: string): void {
  const now = Date.now()
  const recent = prune(key, now)
  recent.push(now)
  buckets.set(key, recent)
}

export function clearAttempts(key: string): void {
  buckets.delete(key)
}

/** Zera todos os contadores (usado ao resetar o mock, p/ isolar os testes). */
export function resetRateLimits(): void {
  buckets.clear()
}
