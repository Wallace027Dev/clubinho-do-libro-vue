<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { usePlatformStore } from '../stores/platformStore'
import BaseButton from './ui/BaseButton.vue'
import StarRating from './ui/StarRating.vue'

const platformStore = usePlatformStore()
const authStore = useAuthStore()

const currentBook = computed(() => platformStore.clubState.currentBook)

const canReview = computed(() => {
  const chapters = currentBook.value?.chapters ?? []
  return (
    chapters.length > 0 && chapters.every((chapter) => chapter.progress[0]?.status === 'FINISHED')
  )
})

// Regra da fase 8: avaliar o livro exige nota em todos os capítulos.
const unratedCount = computed(() => {
  const chapters = currentBook.value?.chapters ?? []
  return chapters.filter((chapter) => !chapter.ratings?.length).length
})

const reviews = computed(() => currentBook.value?.reviews ?? [])
const summary = computed(() => currentBook.value?.reviewSummary ?? { average: null, count: 0 })
const myReview = computed(
  () => reviews.value.find((review) => review.user.id === authStore.user?.id) ?? null
)

const averageLabel = computed(() => {
  if (summary.value.average === null) {
    return null
  }

  return summary.value.average.toFixed(1).replace('.', ',')
})

</script>

<template>
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Avaliação do livro</p>
      <h2>Nota e resenha do clube</h2>
      <p v-if="averageLabel" class="review-stars">
        <StarRating :value="summary.average!" :size="18" />
      </p>
      <p v-if="averageLabel">
        Média do clube: <strong>{{ averageLabel }}</strong> / 5
        <span class="review-count">({{ summary.count }} avaliação{{ summary.count === 1 ? '' : 'es' }})</span>
      </p>
      <p v-else>Ainda não há avaliações deste livro.</p>
    </div>

    <div v-if="canReview && unratedCount === 0" class="review-cta">
      <p class="review-form-label">
        {{ myReview ? 'Você já avaliou este livro.' : 'Você terminou o livro!' }}
      </p>
      <RouterLink to="/review" custom>
        <template #default="{ navigate }">
          <BaseButton :variant="myReview ? 'secondary' : 'primary'" @click="navigate">
            {{ myReview ? 'Editar minha avaliação' : 'Avaliar o livro' }}
          </BaseButton>
        </template>
      </RouterLink>
    </div>

    <p v-else-if="canReview" class="spoiler-lock">
      Falta dar sua nota a {{ unratedCount }} capítulo{{ unratedCount === 1 ? '' : 's' }} para
      liberar a avaliação do livro. Abra cada capítulo e use "Minha nota do capítulo".
    </p>

    <p v-else class="spoiler-lock">
      Conclua todos os capítulos para dar sua nota e resenha.
    </p>

    <RouterLink
      v-if="currentBook && currentBook.chapters.length"
      class="text-link"
      :to="`/books/${currentBook.id}/ratings`"
    >
      Ver avaliação por capítulo
    </RouterLink>

    <ol v-if="reviews.length" class="review-list">
      <li v-for="item in reviews" :key="item.id">
        <div class="review-head">
          <div class="avatar">{{ item.user.displayName?.[0] || item.user.login[0] }}</div>
          <div>
            <strong>{{ item.user.displayName || item.user.login }}</strong>
            <StarRating :value="item.rating" :size="16" />
          </div>
        </div>
        <p v-if="item.review" class="comment-body">{{ item.review }}</p>
      </li>
    </ol>

    <p v-if="reviews.length && !canReview" class="comment-muted">
      As resenhas escritas ficam ocultas até você terminar o livro. As notas já aparecem acima.
    </p>
  </section>
</template>
