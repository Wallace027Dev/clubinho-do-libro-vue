<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import BookCover from '../components/ui/BookCover.vue'
import DetailHeader from '../components/ui/DetailHeader.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import ReviewList from '../components/ui/ReviewList.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import StarRating from '../components/ui/StarRating.vue'
import UserAvatar from '../components/ui/UserAvatar.vue'
import { usePlatformStore } from '../stores/platformStore'
import type { ChapterCommentReactionType } from '../types/platform'
import { isStandaloneChapterTitle } from '../utils/chapters'
import { formatMonthYear, formatRating } from '../utils/format'
import { reactionEmoji } from '../utils/reactions'

const route = useRoute()
const platformStore = usePlatformStore()

const book = computed(() => {
  const bookId = String(route.params.bookId)
  return platformStore.history.find((item) => item.id === bookId) ?? null
})

const averageLabel = computed(() => {
  const average = book.value?.reviewSummary.average
  return average == null ? null : formatRating(average)
})

const finishedLabel = computed(() => formatMonthYear(book.value?.finishedAt))

onMounted(() => {
  if (!platformStore.history.length) {
    void platformStore.loadHistory()
  }
})

function reactionEntries(reactions: Partial<Record<ChapterCommentReactionType, number>>) {
  return Object.entries(reactions) as Array<[ChapterCommentReactionType, number]>
}
</script>

<template>
  <DetailHeader :title="book?.book.title ?? 'Livro lido'" fallback="/history" />

  <EmptyState v-if="platformStore.isLoading && !book" message="Carregando livro..." />

  <template v-else-if="book">
    <SectionCard class="history-card">
      <div class="history-head">
        <BookCover :title="book.book.title" :cover-url="book.book.coverUrl" />

        <div class="history-info">
          <p class="section-label">{{ finishedLabel }}</p>
          <h3>{{ book.book.title }}</h3>
          <p v-if="book.book.author" class="history-author">{{ book.book.author }}</p>
          <p v-if="averageLabel" class="review-stars">
            <StarRating :value="book.reviewSummary.average!" :size="18" />
            <span class="review-count">{{ averageLabel }}/5</span>
          </p>
          <p v-else class="comment-muted">Sem avaliações.</p>
        </div>
      </div>

      <p v-if="book.book.description" class="comment-body">{{ book.book.description }}</p>

      <p class="history-stats">
        {{ book.stats.chapters }} capítulos · {{ book.stats.comments }} comentários ·
        {{ book.stats.reviewers }} avaliações
      </p>

      <RouterLink class="text-link" :to="`/books/${book.id}/ratings`">
        Ver avaliação por capítulo
      </RouterLink>
    </SectionCard>

    <SectionCard v-if="book.reviews.length" label="Resenhas" title="O que o clube achou">
      <ReviewList :reviews="book.reviews" />
    </SectionCard>

    <SectionCard
      v-if="book.stats.comments"
      label="Memória da leitura"
      title="Comentários por capítulo"
    >
      <div v-for="chapter in book.chapters" :key="chapter.id" class="history-chapter">
        <template v-if="chapter.comments.length">
          <p class="chapter-kicker">
            {{ isStandaloneChapterTitle(chapter.title) ? chapter.title : `Capítulo ${chapter.number} — ${chapter.title}` }}
          </p>
          <ol class="comment-list">
            <li v-for="comment in chapter.comments" :key="comment.id">
              <div class="comment-author">
                <UserAvatar :display-name="comment.user.displayName" :login="comment.user.login" />
                <div>
                  <strong>{{ comment.user.displayName || comment.user.login }}</strong>
                  <p>{{ new Date(comment.createdAt).toLocaleDateString('pt-BR') }}</p>
                </div>
              </div>
              <p class="comment-body">{{ comment.body }}</p>
              <div v-if="comment.reactionTotal" class="history-reactions">
                <span v-for="[type, count] in reactionEntries(comment.reactions)" :key="type">
                  {{ reactionEmoji(type) }} {{ count }}
                </span>
              </div>
            </li>
          </ol>
        </template>
      </div>
    </SectionCard>
  </template>

  <SectionCard v-else>
    <EmptyState message="Livro não encontrado no histórico do clube." />
    <RouterLink class="text-link" to="/history">Voltar para livros lidos</RouterLink>
  </SectionCard>
</template>
