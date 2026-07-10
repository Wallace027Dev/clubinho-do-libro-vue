<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlatformStore } from '../stores/platformStore'
import type { ChapterCommentReactionType } from '../types/platform'

const route = useRoute()
const router = useRouter()
const platformStore = usePlatformStore()

const reactionEmoji: Record<ChapterCommentReactionType, string> = {
  GOSTEI: '🙂',
  SOFRI: '😟',
  SURPRESO: '😮',
  SUSPEITO: '🤨',
  DISCUTIR: '💬'
}

const book = computed(() => {
  const bookId = String(route.params.bookId)
  return platformStore.history.find((item) => item.id === bookId) ?? null
})

const averageLabel = computed(() => {
  const average = book.value?.reviewSummary.average
  return average == null ? null : average.toFixed(1).replace('.', ',')
})

const finishedLabel = computed(() => {
  if (!book.value?.finishedAt) {
    return 'Finalizado'
  }

  const label = new Date(book.value.finishedAt).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

onMounted(() => {
  if (!platformStore.history.length) {
    void platformStore.loadHistory()
  }
})

function stars(value: number) {
  const rounded = Math.round(value)
  return '★★★★★☆☆☆☆☆'.slice(5 - rounded, 10 - rounded)
}

function reactionEntries(reactions: Partial<Record<ChapterCommentReactionType, number>>) {
  return Object.entries(reactions) as Array<[ChapterCommentReactionType, number]>
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  void router.push('/history')
}
</script>

<template>
  <header class="detail-header glass-panel">
    <button class="back-button" type="button" aria-label="Voltar" @click="goBack">←</button>
    <h2>{{ book?.book.title ?? 'Livro lido' }}</h2>
  </header>

  <div v-if="platformStore.isLoading && !book" class="empty-state">
    <p>Carregando livro...</p>
  </div>

  <template v-else-if="book">
    <section class="flow-card glass-panel history-card">
      <div class="history-head">
        <div v-if="book.book.coverUrl" class="history-cover">
          <img :src="book.book.coverUrl" :alt="`Capa de ${book.book.title}`" />
        </div>
        <div v-else class="history-cover history-cover--empty" aria-hidden="true">
          {{ book.book.title[0] }}
        </div>

        <div class="history-info">
          <p class="section-label">{{ finishedLabel }}</p>
          <h3>{{ book.book.title }}</h3>
          <p v-if="book.book.author" class="history-author">{{ book.book.author }}</p>
          <p v-if="averageLabel" class="review-stars">
            {{ stars(book.reviewSummary.average!) }}
            <span class="review-count">{{ averageLabel }}/5</span>
          </p>
          <p v-else class="comment-muted">Sem avaliacoes.</p>
        </div>
      </div>

      <p v-if="book.book.description" class="comment-body">{{ book.book.description }}</p>

      <p class="history-stats">
        {{ book.stats.chapters }} capitulos · {{ book.stats.comments }} comentarios ·
        {{ book.stats.reviewers }} avaliacoes
      </p>
    </section>

    <section v-if="book.reviews.length" class="flow-card glass-panel">
      <div class="flow-heading">
        <p class="section-label">Resenhas</p>
        <h2>O que o clube achou</h2>
      </div>

      <ol class="review-list">
        <li v-for="review in book.reviews" :key="review.id">
          <div class="review-head">
            <div class="avatar">{{ review.user.displayName?.[0] || review.user.login[0] }}</div>
            <div>
              <strong>{{ review.user.displayName || review.user.login }}</strong>
              <p class="review-stars" :aria-label="`${review.rating} de 5`">{{ stars(review.rating) }}</p>
            </div>
          </div>
          <p v-if="review.review" class="comment-body">{{ review.review }}</p>
        </li>
      </ol>
    </section>

    <section v-if="book.stats.comments" class="flow-card glass-panel">
      <div class="flow-heading">
        <p class="section-label">Memoria da leitura</p>
        <h2>Comentarios por capitulo</h2>
      </div>

      <div v-for="chapter in book.chapters" :key="chapter.id" class="history-chapter">
        <template v-if="chapter.comments.length">
          <p class="chapter-kicker">Capitulo {{ chapter.number }} — {{ chapter.title }}</p>
          <ol class="comment-list">
            <li v-for="comment in chapter.comments" :key="comment.id">
              <div class="comment-author">
                <div class="avatar">{{ comment.user.displayName?.[0] || comment.user.login[0] }}</div>
                <div>
                  <strong>{{ comment.user.displayName || comment.user.login }}</strong>
                  <p>{{ new Date(comment.createdAt).toLocaleDateString('pt-BR') }}</p>
                </div>
              </div>
              <p class="comment-body">{{ comment.body }}</p>
              <div v-if="comment.reactionTotal" class="history-reactions">
                <span v-for="[type, count] in reactionEntries(comment.reactions)" :key="type">
                  {{ reactionEmoji[type] }} {{ count }}
                </span>
              </div>
            </li>
          </ol>
        </template>
      </div>
    </section>
  </template>

  <section v-else class="flow-card glass-panel">
    <div class="empty-state">
      <p>Livro nao encontrado no historico do clube.</p>
    </div>
    <RouterLink class="text-link" to="/history">Voltar para livros lidos</RouterLink>
  </section>
</template>
