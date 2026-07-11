<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BookCover from '../components/ui/BookCover.vue'
import ClickableCard from '../components/ui/ClickableCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import StarRating from '../components/ui/StarRating.vue'
import { usePlatformStore } from '../stores/platformStore'
import type { FinishedBook } from '../types/platform'
import { formatMonthYear, formatRating } from '../utils/format'

const router = useRouter()
const platformStore = usePlatformStore()
const history = computed(() => platformStore.history)

onMounted(() => {
  void platformStore.loadHistory()
})

function openBook(book: FinishedBook) {
  void router.push(`/history/${book.id}`)
}
</script>

<template>
  <SectionCard
    label="Histórico"
    title="Livros lidos"
    subtitle="A memória do clube: toque em um livro para ver notas, resenhas e comentários."
  >
    <EmptyState
      v-if="platformStore.isLoading && !history.length"
      message="Carregando histórico..."
    />

    <EmptyState
      v-else-if="!history.length"
      message="Nenhum livro finalizado ainda. Quando o clube encerrar um livro, ele aparece aqui."
    />

    <ol v-else class="feed-list">
      <ClickableCard
        v-for="book in history"
        :key="book.id"
        class="history-item"
        :aria-label="`Abrir ${book.book.title}`"
        @activate="openBook(book)"
      >
        <BookCover :title="book.book.title" :cover-url="book.book.coverUrl" small />

        <div class="history-item-info">
          <div class="feed-card-top">
            <span class="feed-tag">{{ formatMonthYear(book.finishedAt) }}</span>
          </div>
          <strong>{{ book.book.title }}</strong>
          <p v-if="book.book.author">{{ book.book.author }}</p>
          <p v-if="book.reviewSummary.average !== null" class="review-stars">
            <StarRating :value="book.reviewSummary.average" :size="16" />
            <span class="review-count">{{ formatRating(book.reviewSummary.average) }}/5</span>
          </p>
          <p v-else class="comment-muted">Sem avaliações.</p>
        </div>

        <ChevronRight class="chapter-chevron" :size="20" aria-hidden="true" />
      </ClickableCard>
    </ol>
  </SectionCard>
</template>
