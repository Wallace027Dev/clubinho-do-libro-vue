/**
 * Linha de metadados do livro: editora · páginas · autor, na ordem em que
 * aparece na listagem da busca.
 *
 * Campo que o provedor não informou simplesmente **desaparece** — mostrar "—"
 * ou "null" seria pior que não mostrar. Quando nada existe, devolve string
 * vazia e a linha não é renderizada.
 */
export interface BookMetaSource {
  publisher?: string | null
  pageCount?: number | null
  /** Páginas vindas de mediana entre edições (Open Library em nível de obra). */
  pageCountApproximate?: boolean
  /** Da busca externa vem lista; do candidato do sorteio, já juntado. */
  authors?: readonly string[]
  author?: string | null
}

function formatPageCount(book: BookMetaSource): string | null {
  if (!book.pageCount || book.pageCount <= 0) {
    return null
  }

  const unidade = book.pageCount === 1 ? 'página' : 'páginas'
  const prefixo = book.pageCountApproximate ? '≈ ' : ''

  return `${prefixo}${book.pageCount} ${unidade}`
}

function formatAuthors(book: BookMetaSource): string | null {
  const daLista = (book.authors ?? []).map((autor) => autor.trim()).filter(Boolean)

  if (daLista.length > 0) {
    return daLista.join(', ')
  }

  return book.author?.trim() || null
}

export function formatBookMeta(book: BookMetaSource): string {
  return [book.publisher?.trim() || null, formatPageCount(book), formatAuthors(book)]
    .filter((parte): parte is string => Boolean(parte))
    .join(' · ')
}
