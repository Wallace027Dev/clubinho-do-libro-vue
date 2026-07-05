<script setup lang="ts">
import { computed } from 'vue'
import type { ChapterCommentReactionType, FinishedBook } from '../types/platform'

const props = defineProps<{
  book: FinishedBook
}>()

const reactionEmoji: Record<ChapterCommentReactionType, string> = {
  GOSTEI: '🙂',
  SOFRI: '😟',
  SURPRESO: '😮',
  SUSPEITO: '🤨',
  DISCUTIR: '💬'
}

const averageLabel = computed(() => {
  const average = props.book.reviewSummary.average
  return average === null ? null : average.toFixed(1).replace('.', ',')
})

const finishedLabel = computed(() => {
  if (!props.book.finishedAt) {
    return null
  }

  const label = new Date(props.book.finishedAt).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

function stars(value: number) {
  const rounded = Math.round(value)
  return '★★★★★☆☆☆☆☆'.slice(5 - rounded, 10 - rounded)
}

function reactionEntries(reactions: Partial<Record<ChapterCommentReactionType, number>>) {
  return Object.entries(reactions) as Array<[ChapterCommentReactionType, number]>
}
</script>

<template>
  <article class="flow-card glass-panel history-card">
    <div class="history-head">
      <div v-if="book.book.coverUrl" class="history-cover">
        <img :src="book.book.coverUrl" :alt="`Capa de ${book.book.title}`" />
      </div>
      <div v-else class="history-cover history-cover--empty" aria-hidden="true">
        {{ book.book.title[0] }}
      </div>

      <div class="history-info">
        <p class="section-label">{{ finishedLabel || 'Finalizado' }}</p>
        <h3>{{ book.book.title }}</h3>
        <p v-if="book.book.author" class="history-author">{{ book.book.author }}</p>
        <p v-if="averageLabel" class="review-stars">
          {{ stars(book.reviewSummary.average!) }}
          <span class="review-count">{{ averageLabel }}/5</span>
        </p>
        <p v-else class="comment-muted">Sem avaliacoes.</p>
      </div>
    </div>

    <p class="history-stats">
      {{ book.stats.chapters }} capitulos · {{ book.stats.comments }} comentarios ·
      {{ book.stats.reviewers }} avaliacoes
    </p>

    <div v-if="book.reviews.length" class="history-section">
      <p class="review-form-label">Resenhas</p>
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
    </div>

    <details v-if="book.stats.comments" class="history-comments">
      <summary>Comentarios arquivados por capitulo</summary>

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
    </details>
  </article>
</template>
