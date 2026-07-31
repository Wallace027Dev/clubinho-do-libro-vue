/**
 * Open Library: só I/O. Não exige chave, e é a reserva quando o Google não está
 * configurado, estoura cota ou não acha nada.
 *
 * A busca é de **obra** (dezenas de edições por resultado), então a rota de
 * detalhe faz uma segunda chamada em `/editions.json` e a regra de escolha da
 * edição — português primeiro, mais completa, desempate estável — vive em
 * `src/domain/bookSearchMapping.ts`.
 */
import type { ExternalBook } from '../../../src/domain/bookSearch.js'
import {
  mapOpenLibraryDoc,
  mergeOpenLibraryEdition,
  pickOpenLibraryEdition
} from '../../../src/domain/bookSearchMapping.js'

const SEARCH_URL = 'https://openlibrary.org/search.json'
const WORKS_URL = 'https://openlibrary.org/works'

/** Só o que é honesto no nível da obra (ver o mapper). */
const FIELDS = 'key,title,author_name,cover_i,number_of_pages_median'

/** Edições vêm paginadas; 50 dá chance real de achar uma em português completa. */
const EDITIONS_LIMIT = 50

const TIMEOUT_MS = 3500

function docsOf(body: unknown): unknown[] {
  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  return Array.isArray(payload.docs) ? payload.docs : []
}

function entriesOf(body: unknown): unknown[] {
  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  return Array.isArray(payload.entries) ? payload.entries : []
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })

  if (!response.ok) {
    throw new Error(`Open Library respondeu ${response.status}.`)
  }

  return response.json()
}

export async function searchOpenLibrary(term: string, limit: number): Promise<ExternalBook[]> {
  const body = await getJson(
    `${SEARCH_URL}?q=${encodeURIComponent(term)}&fields=${FIELDS}&limit=${limit}`
  )

  return docsOf(body)
    .map(mapOpenLibraryDoc)
    .filter((book): book is ExternalBook => book !== null)
}

/** A chave entra na URL do provedor: aceita só o formato `/works/OL123W`. */
export function openLibraryWorkId(workKey: string): string | null {
  const match = /^\/works\/(OL\d+W)$/.exec(workKey)
  return match ? match[1] : null
}

export async function getOpenLibraryBook(workKey: string): Promise<ExternalBook | null> {
  const workId = openLibraryWorkId(workKey)

  if (!workId) {
    return null
  }

  const searchBody = await getJson(
    `${SEARCH_URL}?q=key:${encodeURIComponent(workKey)}&fields=${FIELDS}&limit=1`
  )
  const work = mapOpenLibraryDoc(docsOf(searchBody)[0])

  if (!work) {
    return null
  }

  // Falhar aqui não invalida a obra: devolvemos o nível de obra (páginas segue
  // marcado como aproximado) em vez de negar o livro inteiro.
  try {
    const editionsBody = await getJson(`${WORKS_URL}/${workId}/editions.json?limit=${EDITIONS_LIMIT}`)
    return mergeOpenLibraryEdition(work, pickOpenLibraryEdition(entriesOf(editionsBody)))
  } catch (error) {
    console.warn('[bookSearch] edições do Open Library falharam:', (error as Error).message)
    return work
  }
}
