<script setup lang="ts">
/**
 * Busca de livro por título ou autor, com resultado em lista clicável.
 *
 * A busca sai 300ms depois da última tecla (não a cada tecla): é o que segura a
 * cota do provedor externo. Ao escolher uma opção, busca os dados completos do
 * livro (sinopse no Google; edição concreta com editora/páginas/ISBN no Open
 * Library) e emite o livro já enriquecido.
 */
import { onBeforeUnmount, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import AppSpinner from './ui/AppSpinner.vue'
import BookCover from './ui/BookCover.vue'
import ClickableCard from './ui/ClickableCard.vue'
import EmptyState from './ui/EmptyState.vue'
import SkeletonLoader from './ui/SkeletonLoader.vue'
import { MIN_SEARCH_TERM_LENGTH, type ExternalBook } from '../domain/bookSearch'
import { useBookSearchStore } from '../stores/bookSearchStore'
import { formatBookMeta } from '../utils/bookMeta'

const DEBOUNCE_MS = 300

const emit = defineEmits<{ select: [book: ExternalBook] }>()

const bookSearchStore = useBookSearchStore()
const term = ref('')
const pendingId = ref<string | null>(null)

let debounceTimer: number | undefined

function scheduleSearch() {
  window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    void bookSearchStore.searchBooks(term.value)
  }, DEBOUNCE_MS)
}

// Sem isso, sobra timer depois de sair da tela (e vaza entre testes).
onBeforeUnmount(() => window.clearTimeout(debounceTimer))

async function choose(book: ExternalBook) {
  if (pendingId.value) {
    return
  }

  pendingId.value = book.providerId

  try {
    // O item da lista não traz sinopse; o detalhe traz.
    const completo = await bookSearchStore.loadBookDetail(book.source, book.providerId)
    emit('select', completo)
  } catch {
    // Falhou o detalhe: ainda dá para seguir com o que a listagem trouxe.
    emit('select', book)
  } finally {
    pendingId.value = null
    term.value = ''
    bookSearchStore.clear()
  }
}
</script>

<template>
  <div class="book-search">
    <label class="feed-search">
      <span class="visually-hidden">Buscar livro por título ou autor</span>
      <input
        v-model="term"
        type="search"
        autocomplete="off"
        placeholder="Buscar por título ou autor..."
        @input="scheduleSearch"
      />
      <Search class="feed-search-icon" :size="18" aria-hidden="true" />
    </label>

    <SkeletonLoader
      v-if="bookSearchStore.isSearching"
      :rows="3"
      height="92px"
      radius="12px"
      label="Buscando livros"
    />

    <p v-else-if="bookSearchStore.errorMessage" class="form-error" role="status">
      {{ bookSearchStore.errorMessage }}
    </p>

    <ol v-else-if="bookSearchStore.results.length" class="book-search-list">
      <ClickableCard
        v-for="book in bookSearchStore.results"
        :key="`${book.source}:${book.providerId}`"
        class="book-search-item"
        :aria-label="`Escolher ${book.title}`"
        @activate="choose(book)"
      >
        <div class="book-search-cover">
          <BookCover :title="book.title" :cover-url="book.coverUrl" fill />
        </div>

        <div class="book-search-info">
          <strong>{{ book.title }}</strong>
          <p v-if="formatBookMeta(book)">{{ formatBookMeta(book) }}</p>
        </div>

        <AppSpinner v-if="pendingId === book.providerId" size="1rem" label="Carregando livro" />
      </ClickableCard>
    </ol>

    <EmptyState
      v-else-if="term.trim().length >= MIN_SEARCH_TERM_LENGTH"
      message="Nenhum livro encontrado. Você ainda pode adicionar à mão."
    />
  </div>
</template>
