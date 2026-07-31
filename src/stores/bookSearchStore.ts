import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  MIN_SEARCH_TERM_LENGTH,
  type ExternalBook,
  type ExternalBookSource
} from '../domain/bookSearch'
import { ApiError, apiRequest } from '../services/apiClient'

interface BookSearchResponse {
  provider: ExternalBookSource | null
  results: ExternalBook[]
}

interface BookDetailResponse {
  book: ExternalBook
}

/**
 * Busca externa de livro (usada no sorteio). Store própria em vez de engordar a
 * `platformStore`: não é estado do clube, é estado de uma tela de escolha.
 */
export const useBookSearchStore = defineStore('bookSearch', () => {
  const results = ref<ExternalBook[]>([])
  const isSearching = ref(false)
  const isLoadingDetail = ref(false)
  const errorMessage = ref('')
  /** Último termo efetivamente buscado (evita repetir a mesma requisição). */
  const lastTerm = ref('')

  function clear() {
    results.value = []
    errorMessage.value = ''
    lastTerm.value = ''
  }

  async function searchBooks(rawTerm: string) {
    const term = rawTerm.trim().replace(/\s+/g, ' ')

    // Termo curto não vale requisição: o servidor devolveria 400.
    if (term.length < MIN_SEARCH_TERM_LENGTH) {
      clear()
      return
    }

    if (term === lastTerm.value) {
      return
    }

    isSearching.value = true
    errorMessage.value = ''

    try {
      const response = await apiRequest<BookSearchResponse>(
        `/api/books/search?q=${encodeURIComponent(term)}`
      )
      results.value = response.results
      lastTerm.value = term
    } catch (error) {
      results.value = []
      lastTerm.value = ''
      errorMessage.value =
        error instanceof ApiError ? error.message : 'Não foi possível buscar agora.'
    } finally {
      isSearching.value = false
    }
  }

  /**
   * Dados completos do livro escolhido — é aqui que vem a sinopse (Google) e a
   * edição concreta com editora/páginas/ISBN (Open Library).
   */
  async function loadBookDetail(
    source: ExternalBookSource,
    providerId: string
  ): Promise<ExternalBook> {
    isLoadingDetail.value = true
    errorMessage.value = ''

    try {
      const response = await apiRequest<BookDetailResponse>(
        `/api/books/external?source=${encodeURIComponent(source)}&id=${encodeURIComponent(providerId)}`
      )
      return response.book
    } finally {
      isLoadingDetail.value = false
    }
  }

  return {
    results,
    isSearching,
    isLoadingDetail,
    errorMessage,
    searchBooks,
    loadBookDetail,
    clear
  }
})
