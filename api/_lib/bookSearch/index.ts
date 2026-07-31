/**
 * Cadeia de provedores da busca de livro: Google Books primeiro (dado por
 * edição, coerente entre si), Open Library como reserva.
 *
 * Cai para a reserva quando o Google não está configurado, falha (cota 429,
 * 5xx, timeout) **ou não acha nada**. Nunca mistura provedores num mesmo
 * resultado — o campo `provider` diz quem respondeu.
 */
import {
  dedupeExternalBooks,
  MAX_SEARCH_RESULTS,
  type ExternalBook,
  type ExternalBookSource
} from '../../../src/domain/bookSearch.js'
import { getGoogleVolume, googleApiKey, searchGoogleBooks } from './google.js'
import { getOpenLibraryBook, searchOpenLibrary } from './openLibrary.js'

export interface BookSearchOutcome {
  provider: ExternalBookSource | null
  results: ExternalBook[]
  /** Todos os provedores falharam — a rota devolve 503, não "nada encontrado". */
  unavailable: boolean
}

export async function searchBooks(term: string): Promise<BookSearchOutcome> {
  if (googleApiKey()) {
    try {
      const results = dedupeExternalBooks(await searchGoogleBooks(term, MAX_SEARCH_RESULTS))

      if (results.length > 0) {
        return { provider: 'google', results, unavailable: false }
      }
    } catch (error) {
      console.warn('[bookSearch] Google Books falhou:', (error as Error).message)
    }
  }

  try {
    return {
      provider: 'openlibrary',
      results: dedupeExternalBooks(await searchOpenLibrary(term, MAX_SEARCH_RESULTS)),
      unavailable: false
    }
  } catch (error) {
    console.warn('[bookSearch] Open Library falhou:', (error as Error).message)
    return { provider: null, results: [], unavailable: true }
  }
}

export async function getExternalBook(
  source: ExternalBookSource,
  id: string
): Promise<ExternalBook | null> {
  if (source === 'google') {
    return googleApiKey() ? getGoogleVolume(id) : null
  }

  return getOpenLibraryBook(id)
}
