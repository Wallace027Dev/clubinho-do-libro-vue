<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { usePlatformStore } from '../stores/platformStore'
import BaseButton from './ui/BaseButton.vue'

const platformStore = usePlatformStore()
const authStore = useAuthStore()

const currentBook = computed(() => platformStore.clubState.currentBook)

const canReview = computed(() => {
  const chapters = currentBook.value?.chapters ?? []
  return (
    chapters.length > 0 && chapters.every((chapter) => chapter.progress[0]?.status === 'FINISHED')
  )
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

function stars(value: number) {
  const rounded = Math.round(value)
  return '★★★★★☆☆☆☆☆'.slice(5 - rounded, 10 - rounded)
}
</script>

<template>
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Avaliacao do livro</p>
      <h2>Nota e resenha do clube</h2>
      <p v-if="averageLabel">
        Media do clube: <strong>{{ averageLabel }}</strong> / 5
        <span class="review-count">({{ summary.count }} avaliacao{{ summary.count === 1 ? '' : 'es' }})</span>
      </p>
      <p v-else>Ainda nao ha avaliacoes deste livro.</p>
    </div>

    <div v-if="canReview" class="review-cta">
      <p class="review-form-label">
        {{ myReview ? 'Voce ja avaliou este livro.' : 'Voce terminou o livro!' }}
      </p>
      <RouterLink to="/review" custom>
        <template #default="{ navigate }">
          <BaseButton :variant="myReview ? 'secondary' : 'primary'" @click="navigate">
            {{ myReview ? 'Editar minha avaliacao' : 'Avaliar o livro' }}
          </BaseButton>
        </template>
      </RouterLink>
    </div>

    <p v-else class="spoiler-lock">
      Conclua todos os capitulos para dar sua nota e resenha.
    </p>

    <ol v-if="reviews.length" class="review-list">
      <li v-for="item in reviews" :key="item.id">
        <div class="review-head">
          <div class="avatar">{{ item.user.displayName?.[0] || item.user.login[0] }}</div>
          <div>
            <strong>{{ item.user.displayName || item.user.login }}</strong>
            <p class="review-stars" :aria-label="`${item.rating} de 5`">{{ stars(item.rating) }}</p>
          </div>
        </div>
        <p v-if="item.review" class="comment-body">{{ item.review }}</p>
      </li>
    </ol>

    <p v-if="reviews.length && !canReview" class="comment-muted">
      As resenhas escritas ficam ocultas ate voce terminar o livro. As notas ja aparecem acima.
    </p>
  </section>
</template>
