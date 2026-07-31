/**
 * Busca externa de livro (usada no sorteio para escolher o candidato).
 *
 * Aqui mora só o que é regra, compartilhado entre o backend real e o mock de
 * homologação: a forma normalizada do resultado, a validação do termo e a
 * deduplicação. A tradução do payload de cada provedor (Google Books, Open
 * Library) fica na borda, em `api/_lib/bookSearch/`.
 */

export type ExternalBookSource = 'google' | 'openlibrary'

export interface ExternalBook {
  source: ExternalBookSource
  /** Chave estável no provedor: volumeId (Google) ou key da obra (Open Library). */
  providerId: string
  title: string
  /** Sempre array; vazio quando o provedor não informa. */
  authors: string[]
  publisher: string | null
  pageCount: number | null
  /**
   * `true` quando o número de páginas é mediana entre edições (Open Library em
   * nível de obra) — a UI mostra "≈ 320 páginas" em vez de afirmar o exato.
   */
  pageCountApproximate: boolean
  isbn: string | null
  coverUrl: string | null
  /** Só vem na rota de detalhe; a listagem não carrega sinopse. */
  description: string | null
}

/** Menos que isso gera resultado inútil e queima cota do provedor. */
export const MIN_SEARCH_TERM_LENGTH = 2

export const MAX_SEARCH_RESULTS = 10

export type BookSearchQueryDecision =
  | { ok: false; status: 400; error: string }
  | { ok: true; term: string }

export function resolveBookSearchQuery(raw: unknown): BookSearchQueryDecision {
  const term = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : ''

  if (term.length < MIN_SEARCH_TERM_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `Digite pelo menos ${MIN_SEARCH_TERM_LENGTH} caracteres para buscar.`
    }
  }

  return { ok: true, term }
}

/** Mesma normalização da busca do feed: sem acento, sem caixa, sem espaço duplo. */
function normalizeForComparison(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Um provedor devolve a mesma obra em edições diferentes; a listagem mostraria
 * linhas repetidas. Chave: título + primeiro autor normalizados. Mantém a
 * primeira ocorrência (a mais relevante, já que a ordem vem do provedor).
 */
export function dedupeExternalBooks(items: readonly ExternalBook[]): ExternalBook[] {
  const seen = new Set<string>()
  const unique: ExternalBook[] = []

  for (const item of items) {
    const key = `${normalizeForComparison(item.title)}|${normalizeForComparison(item.authors[0] ?? '')}`

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    unique.push(item)
  }

  return unique
}
