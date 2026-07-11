<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import DetailHeader from '../components/ui/DetailHeader.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import RatingInput from '../components/ui/RatingInput.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import { useGoBack } from '../composables/useGoBack'
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

const cancel = useGoBack('/chapters')
</script>

<template>
  <DetailHeader title="Avaliar o livro" fallback="/chapters" />

  <EmptyState v-if="platformStore.isLoading && !currentBook" message="Carregando..." />

  <SectionCard v-else-if="currentBook && canReview" class="activity-detail">
    <div>
      <p class="section-label">{{ currentBook.book.title }}</p>
      <h2>De modo geral, o que você achou do livro?</h2>
    </div>

    <form class="stack-form review-form" @submit.prevent="submit">
      <p class="review-form-label">{{ myReview ? 'Editar sua nota' : 'Sua nota' }}</p>
      <RatingInput v-model="rating" :size="30" />

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
  </SectionCard>

  <SectionCard v-else>
    <EmptyState>
      <p v-if="currentBook">
        Conclua todos os capítulos para dar sua nota e resenha.
      </p>
      <p v-else>Nenhum livro em andamento para avaliar.</p>
    </EmptyState>
    <RouterLink class="text-link" to="/chapters">Ir para meus capítulos</RouterLink>
  </SectionCard>
</template>
