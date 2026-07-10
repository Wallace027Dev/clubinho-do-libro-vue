<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlatformStore } from '../stores/platformStore'
import type { FinishedBook } from '../types/platform'

const router = useRouter()
const platformStore = usePlatformStore()
const history = computed(() => platformStore.history)

onMounted(() => {
  void platformStore.loadHistory()
})

function finishedLabel(book: FinishedBook) {
  if (!book.finishedAt) {
    return 'Finalizado'
  }

  const label = new Date(book.finishedAt).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function stars(value: number) {
  const rounded = Math.round(value)
  return '★★★★★☆☆☆☆☆'.slice(5 - rounded, 10 - rounded)
}

function openBook(book: FinishedBook) {
  void router.push(`/history/${book.id}`)
}
</script>

<template>
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Historico</p>
      <h2>Livros lidos</h2>
      <p>A memoria do clube: toque em um livro para ver notas, resenhas e comentarios.</p>
    </div>

    <div v-if="platformStore.isLoading && !history.length" class="empty-state">
      <p>Carregando historico...</p>
    </div>

    <div v-else-if="!history.length" class="empty-state">
      <p>Nenhum livro finalizado ainda. Quando o clube encerrar um livro, ele aparece aqui.</p>
    </div>

    <ol v-else class="feed-list">
      <li
        v-for="book in history"
        :key="book.id"
        class="feed-card is-clickable history-item"
        role="button"
        tabindex="0"
        :aria-label="`Abrir ${book.book.title}`"
        @click="openBook(book)"
        @keydown.enter.prevent="openBook(book)"
        @keydown.space.prevent="openBook(book)"
      >
        <div v-if="book.book.coverUrl" class="history-cover history-cover--small">
          <img :src="book.book.coverUrl" :alt="`Capa de ${book.book.title}`" />
        </div>
        <div v-else class="history-cover history-cover--small history-cover--empty" aria-hidden="true">
          {{ book.book.title[0] }}
        </div>

        <div class="history-item-info">
          <div class="feed-card-top">
            <span class="feed-tag">{{ finishedLabel(book) }}</span>
          </div>
          <strong>{{ book.book.title }}</strong>
          <p v-if="book.book.author">{{ book.book.author }}</p>
          <p v-if="book.reviewSummary.average !== null" class="review-stars">
            {{ stars(book.reviewSummary.average) }}
            <span class="review-count">
              {{ book.reviewSummary.average.toFixed(1).replace('.', ',') }}/5
            </span>
          </p>
          <p v-else class="comment-muted">Sem avaliacoes.</p>
        </div>

        <span class="chapter-chevron" aria-hidden="true">›</span>
      </li>
    </ol>
  </section>
</template>
