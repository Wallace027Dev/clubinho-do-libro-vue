<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ApiError } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import { usePlatformStore } from '../stores/platformStore'
import { useUiStore } from '../stores/uiStore'
import BaseButton from './ui/BaseButton.vue'

const platformStore = usePlatformStore()
const authStore = useAuthStore()
const uiStore = useUiStore()

const currentBook = computed(() => platformStore.clubState.currentBook)

const canReview = computed(() => {
  const chapters = currentBook.value?.chapters ?? []
  return chapters.length > 0 && chapters.every((chapter) => chapter.progress[0]?.status === 'FINISHED')
})

const reviews = computed(() => currentBook.value?.reviews ?? [])
const summary = computed(() => currentBook.value?.reviewSummary ?? { average: null, count: 0 })
const myReview = computed(() =>
  reviews.value.find((review) => review.user.id === authStore.user?.id) ?? null
)

const rating = ref(0)
const reviewText = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

// Sincroniza o formulario com a avaliacao ja existente do usuario.
watch(
  myReview,
  (review) => {
    rating.value = review?.rating ?? 0
    reviewText.value = review?.review ?? ''
  },
  { immediate: true }
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

async function submit() {
  errorMessage.value = ''

  if (rating.value < 1) {
    errorMessage.value = 'Escolha uma nota de 1 a 5.'
    return
  }

  isSubmitting.value = true

  try {
    await platformStore.submitReview(rating.value, reviewText.value)
    uiStore.notify('Avaliacao salva com sucesso!')
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Nao foi possivel salvar a avaliacao.'
  } finally {
    isSubmitting.value = false
  }
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

    <form v-if="canReview" class="stack-form review-form" @submit.prevent="submit">
      <p class="review-form-label">{{ myReview ? 'Editar sua nota' : 'Sua nota' }}</p>
      <div class="star-input" role="radiogroup" aria-label="Nota de 1 a 5">
        <button
          v-for="value in 5"
          :key="value"
          type="button"
          class="star-button"
          :class="{ active: value <= rating }"
          role="radio"
          :aria-checked="value === rating"
          :aria-label="`${value} de 5`"
          @click="rating = value"
        >
          ★
        </button>
      </div>

      <label>
        Resenha (opcional)
        <textarea
          v-model="reviewText"
          maxlength="1000"
          placeholder="O que voce achou do livro? Pode escrever com spoiler: so aparece para quem terminou."
        ></textarea>
      </label>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <BaseButton type="submit" :loading="isSubmitting">
        {{ isSubmitting ? 'Salvando...' : myReview ? 'Atualizar avaliacao' : 'Finalizar e avaliar' }}
      </BaseButton>
    </form>

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
