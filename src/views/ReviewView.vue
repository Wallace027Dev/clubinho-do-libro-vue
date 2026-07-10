<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import StarRating from '../components/ui/StarRating.vue'
import { ApiError } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import { usePlatformStore } from '../stores/platformStore'
import { useUiStore } from '../stores/uiStore'

const router = useRouter()
const authStore = useAuthStore()
const platformStore = usePlatformStore()
const uiStore = useUiStore()

const currentBook = computed(() => platformStore.clubState.currentBook)

const canReview = computed(() => {
  const chapters = currentBook.value?.chapters ?? []
  return (
    chapters.length > 0 && chapters.every((chapter) => chapter.progress[0]?.status === 'FINISHED')
  )
})

const myReview = computed(
  () =>
    currentBook.value?.reviews?.find((review) => review.user.id === authStore.user?.id) ?? null
)

const rating = ref(0)
const reviewText = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

watch(
  myReview,
  (review) => {
    rating.value = review?.rating ?? 0
    reviewText.value = review?.review ?? ''
  },
  { immediate: true }
)

onMounted(() => {
  if (!currentBook.value) {
    void platformStore.loadHome()
  }
})

async function submit() {
  errorMessage.value = ''

  if (rating.value < 1) {
    errorMessage.value = 'Escolha uma nota de 1 a 5.'
    return
  }

  isSubmitting.value = true

  try {
    await platformStore.submitReview(rating.value, reviewText.value)
    uiStore.notify('Avaliação registrada com sucesso!')
    void router.push('/chapters')
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError ? error.message : 'Não foi possível salvar a avaliação.'
  } finally {
    isSubmitting.value = false
  }
}

function cancel() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  void router.push('/chapters')
}
</script>

<template>
  <header class="detail-header glass-panel">
    <button class="back-button" type="button" aria-label="Voltar" @click="cancel"><ArrowLeft :size="20" /></button>
    <h2>Avaliar o livro</h2>
  </header>

  <div v-if="platformStore.isLoading && !currentBook" class="empty-state">
    <p>Carregando...</p>
  </div>

  <section v-else-if="currentBook && canReview" class="flow-card glass-panel activity-detail">
    <div>
      <p class="section-label">{{ currentBook.book.title }}</p>
      <h2>De modo geral, o que você achou do livro?</h2>
    </div>

    <form class="stack-form review-form" @submit.prevent="submit">
      <p class="review-form-label">{{ myReview ? 'Editar sua nota' : 'Sua nota' }}</p>
      <div class="rating-input">
        <StarRating :value="rating" :size="30" />
        <input
          v-model.number="rating"
          type="range"
          min="1"
          max="5"
          step="0.1"
          aria-label="Nota de 1 a 5, em passos de 0,1"
        />
        <span class="rating-value">
          {{ rating >= 1 ? `${rating.toFixed(1).replace('.', ',')}/5` : 'Arraste para dar a nota' }}
        </span>
      </div>

      <label>
        Resenha (opcional)
        <textarea
          v-model="reviewText"
          maxlength="1000"
          placeholder="O que você achou do livro? Pode escrever com spoiler: só aparece para quem terminou."
        ></textarea>
      </label>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <div class="action-stack">
        <BaseButton type="submit" :loading="isSubmitting">
          {{ isSubmitting ? 'Salvando...' : 'Confirmar' }}
        </BaseButton>
        <BaseButton variant="outline" :disabled="isSubmitting" @click="cancel">
          Cancelar
        </BaseButton>
      </div>
    </form>
  </section>

  <section v-else class="flow-card glass-panel">
    <div class="empty-state">
      <p v-if="currentBook">
        Conclua todos os capítulos para dar sua nota e resenha.
      </p>
      <p v-else>Nenhum livro em andamento para avaliar.</p>
    </div>
    <RouterLink class="text-link" to="/chapters">Ir para meus capítulos</RouterLink>
  </section>
</template>
