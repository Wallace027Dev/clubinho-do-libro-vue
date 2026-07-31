/**
 * Tradução dos payloads dos provedores de livro para a forma única
 * (`ExternalBook`), e a regra de escolha da edição no Open Library.
 *
 * Vive no domínio — e não em `api/_lib/` — por um motivo prático: o vitest só
 * cobre `src/**` e `test/integration/**`, então lógica posta em `api/` fica sem
 * teste. Aqui em cima fica tudo que é decisão; em `api/_lib/bookSearch/` fica
 * só o I/O (fetch, timeout, cadeia de fallback).
 */
import type { ExternalBook } from './bookSearch.js'

// --- Leitores defensivos (payload de terceiro, nada é garantido) ------------

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function positiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : null
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function strings(value: unknown): string[] {
  return list(value)
    .map((item) => str(item))
    .filter((item): item is string => item !== null)
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/** O Google devolve capa em `http://`; numa página https isso é bloqueado. */
function forceHttps(url: string | null): string | null {
  return url ? url.replace(/^http:\/\//i, 'https://') : null
}

// --- Google Books ----------------------------------------------------------

export function mapGoogleVolume(raw: unknown): ExternalBook | null {
  const volume = record(raw)
  const providerId = str(volume.id)
  const info = record(volume.volumeInfo)
  const title = str(info.title)

  if (!providerId || !title) {
    return null
  }

  const identifiers = list(info.industryIdentifiers).map(record)
  const isbn13 = identifiers.find((item) => str(item.type) === 'ISBN_13')
  const isbn10 = identifiers.find((item) => str(item.type) === 'ISBN_10')
  const images = record(info.imageLinks)

  return {
    source: 'google',
    providerId,
    title,
    authors: strings(info.authors),
    publisher: str(info.publisher),
    pageCount: positiveInt(info.pageCount),
    pageCountApproximate: false,
    isbn: str(isbn13?.identifier) ?? str(isbn10?.identifier),
    coverUrl: forceHttps(str(images.thumbnail) ?? str(images.smallThumbnail)),
    description: str(info.description)
  }
}

// --- Open Library ---------------------------------------------------------

const COVER_BASE = 'https://covers.openlibrary.org/b/id'

export function openLibraryCoverUrl(coverId: unknown): string | null {
  const id = positiveInt(coverId)
  return id ? `${COVER_BASE}/${id}-M.jpg` : null
}

/**
 * Resultado da busca do Open Library é de **obra**, não de edição: `publisher` e
 * `isbn` vêm com dezenas de entradas de edições variadas (frequentemente
 * estrangeiras) e o total de páginas é mediana. Então aqui só entra o que é
 * honesto no nível da obra — editora e ISBN ficam nulos até a rota de detalhe
 * resolver uma edição concreta.
 */
export function mapOpenLibraryDoc(raw: unknown): ExternalBook | null {
  const doc = record(raw)
  const providerId = str(doc.key)
  const title = str(doc.title)

  if (!providerId || !title) {
    return null
  }

  return {
    source: 'openlibrary',
    providerId,
    title,
    authors: strings(doc.author_name),
    publisher: null,
    pageCount: positiveInt(doc.number_of_pages_median),
    pageCountApproximate: true,
    isbn: null,
    coverUrl: openLibraryCoverUrl(doc.cover_i),
    description: null
  }
}

export interface OpenLibraryEdition {
  key: string
  publisher: string | null
  pageCount: number | null
  isbn: string | null
  coverUrl: string | null
  isPortuguese: boolean
  /** Quantos dos três campos que interessam a edição tem (0..3). */
  completeness: number
}

export function readOpenLibraryEdition(raw: unknown): OpenLibraryEdition | null {
  const entry = record(raw)
  const key = str(entry.key)

  if (!key) {
    return null
  }

  const publisher = strings(entry.publishers)[0] ?? null
  const pageCount = positiveInt(entry.number_of_pages)
  const isbn = strings(entry.isbn_13)[0] ?? strings(entry.isbn_10)[0] ?? null
  const languages = list(entry.languages).map((item) => str(record(item).key))

  return {
    key,
    publisher,
    pageCount,
    isbn,
    coverUrl: openLibraryCoverUrl(list(entry.covers)[0]),
    isPortuguese: languages.includes('/languages/por'),
    completeness: (publisher ? 1 : 0) + (pageCount ? 1 : 0) + (isbn ? 1 : 0)
  }
}

/**
 * Escolhe uma edição concreta: português primeiro (é um clube brasileiro),
 * depois a mais completa, com desempate estável pela menor chave — para que a
 * mesma obra devolva sempre a mesma edição, independente da ordem da API.
 */
export function pickOpenLibraryEdition(entries: readonly unknown[]): OpenLibraryEdition | null {
  const editions = entries
    .map(readOpenLibraryEdition)
    .filter((edition): edition is OpenLibraryEdition => edition !== null)

  if (editions.length === 0) {
    return null
  }

  const portuguese = editions.filter((edition) => edition.isPortuguese)
  const candidates = portuguese.length > 0 ? portuguese : editions

  return candidates
    .slice()
    .sort((a, b) => b.completeness - a.completeness || a.key.localeCompare(b.key))[0]
}

/**
 * Enriquece a obra com a edição escolhida. Sem edição utilizável, mantém os
 * valores de obra (páginas segue aproximado) em vez de inventar precisão.
 */
export function mergeOpenLibraryEdition(
  work: ExternalBook,
  edition: OpenLibraryEdition | null
): ExternalBook {
  if (!edition) {
    return work
  }

  return {
    ...work,
    publisher: edition.publisher,
    pageCount: edition.pageCount ?? work.pageCount,
    pageCountApproximate: edition.pageCount ? false : work.pageCountApproximate,
    isbn: edition.isbn,
    coverUrl: work.coverUrl ?? edition.coverUrl
  }
}
