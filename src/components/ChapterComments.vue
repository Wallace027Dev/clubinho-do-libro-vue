<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, apiRequest } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import type { ChapterComment, ChapterCommentReactionType } from '../types/platform'

const props = defineProps<{
  chapterId: string
}>()

const authStore = useAuthStore()

const reactionOptions: Array<{ type: ChapterCommentReactionType; emoji: string; label: string }> = [
  { type: 'GOSTEI', emoji: '🙂', label: 'gostei' },
  { type: 'SOFRI', emoji: '😟', label: 'sofri' },
  { type: 'SURPRESO', emoji: '😮', label: 'surpresa' },
  { type: 'SUSPEITO', emoji: '🤨', label: 'suspeito' },
  { type: 'DISCUTIR', emoji: '💬', label: 'discutir' }
]

const myComment = ref<ChapterComment | null>(null)
const body = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSubmitting = ref(false)

const hasComment = computed(() => Boolean(myComment.value))

onMounted(() => {
  void loadComment()
})

async function loadComment() {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const response = await apiRequest<{ comments: ChapterComment[] }>(
      `/api/chapters/${props.chapterId}/comments`
    )
    myComment.value =
      response.comments.find((comment) => comment.user.id === authStore.user?.id) ?? null
    body.value = myComment.value?.body ?? ''
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Nao foi possivel carregar seu comentario.'
  } finally {
    isLoading.value = false
  }
}

async function submitComment() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    const response = await apiRequest<{ comments: ChapterComment[] }>(
      `/api/chapters/${props.chapterId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ body: body.value })
      }
    )
    myComment.value =
      response.comments.find((comment) => comment.user.id === authStore.user?.id) ?? null
    body.value = myComment.value?.body ?? ''
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Nao foi possivel comentar.'
  } finally {
    isSubmitting.value = false
  }
}

function reactionEmoji(type: ChapterCommentReactionType) {
  return reactionOptions.find((reaction) => reaction.type === type)?.emoji ?? '🙂'
}

function reactionLabel(type: ChapterCommentReactionType) {
  return reactionOptions.find((reaction) => reaction.type === type)?.label ?? 'reacao'
}
</script>

<template>
  <div class="chapter-comments">
    <form class="comment-form" @submit.prevent="submitComment">
      <label>
        {{ hasComment ? 'Editar meu comentario' : 'Meu comentario do capitulo' }}
        <textarea
          v-model="body"
          maxlength="420"
          placeholder="Escreva uma impressao curta. Ela aparece no feed para quem ja concluiu o capitulo."
          required
        ></textarea>
      </label>

      <button class="secondary-action" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Salvando...' : hasComment ? 'Salvar alteracao' : 'Comentar' }}
      </button>
    </form>

    <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
    <p v-else-if="isLoading" class="comment-muted">Carregando seu comentario...</p>

    <div
      v-if="myComment && myComment.reactionTotal"
      class="reaction-stack"
      :aria-label="`${myComment.reactionTotal} reacoes no seu comentario`"
    >
      <span
        v-for="(reaction, index) in myComment.recentReactions"
        :key="`${reaction.type}-${reaction.updatedAt}-${index}`"
        class="reaction-bubble"
        :style="{ zIndex: String(myComment.recentReactions.length - index) }"
        :title="reactionLabel(reaction.type)"
      >
        {{ reactionEmoji(reaction.type) }}
      </span>
      <span v-if="myComment.reactionTotal > myComment.recentReactions.length" class="reaction-count">
        +{{ myComment.reactionTotal - myComment.recentReactions.length }}
      </span>
    </div>

    <p v-else-if="myComment" class="comment-muted">Seu comentario ainda nao recebeu reacoes.</p>
  </div>
</template>
