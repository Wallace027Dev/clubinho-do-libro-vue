/**
 * Google Books: só I/O. O mapeamento do payload vive em
 * `src/domain/bookSearchMapping.ts` (onde o vitest alcança).
 *
 * Sem `GOOGLE_BOOKS_API_KEY` a API responde 429 por IP, então a chave é lida de
 * forma memoizada e a ausência dela **não** é erro: o orquestrador pula para o
 * Open Library. Mesma filosofia do VAPID em `api/_lib/push.ts` — sem segredo,
 * degrada em vez de quebrar.
 */
import type { ExternalBook } from '../../../src/domain/bookSearch.js'
import { mapGoogleVolume } from '../../../src/domain/bookSearchMapping.js'

const BASE_URL = 'https://www.googleapis.com/books/v1'

/** Um provedor pendurado não pode consumir a execução inteira da function. */
const TIMEOUT_MS = 3500

/** `undefined` = ainda não resolvido; `null` = não configurado. */
let apiKey: string | null | undefined

export function googleApiKey(): string | null {
  if (apiKey === undefined) {
    const raw = process.env.GOOGLE_BOOKS_API_KEY
    apiKey = raw && raw.trim() ? raw.trim() : null
  }

  return apiKey
}

function itemsOf(body: unknown): unknown[] {
  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  return Array.isArray(payload.items) ? payload.items : []
}

async function getJson(path: string): Promise<unknown> {
  const key = googleApiKey()

  if (!key) {
    throw new Error('GOOGLE_BOOKS_API_KEY não configurada.')
  }

  const separator = path.includes('?') ? '&' : '?'
  const response = await fetch(`${BASE_URL}/${path}${separator}key=${encodeURIComponent(key)}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error(`Google Books respondeu ${response.status}.`)
  }

  return response.json()
}

export async function searchGoogleBooks(term: string, limit: number): Promise<ExternalBook[]> {
  const body = await getJson(
    `volumes?q=${encodeURIComponent(term)}&maxResults=${limit}&printType=books`
  )

  return itemsOf(body)
    .map(mapGoogleVolume)
    .filter((book): book is ExternalBook => book !== null)
}

/** O id vai para o path da URL do provedor: só aceita o formato do volumeId. */
export function isGoogleVolumeId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id)
}

export async function getGoogleVolume(id: string): Promise<ExternalBook | null> {
  if (!isGoogleVolumeId(id)) {
    return null
  }

  return mapGoogleVolume(await getJson(`volumes/${id}`))
}
