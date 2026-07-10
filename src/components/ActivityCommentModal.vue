<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { ApiError, apiRequest } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import type { Activity, ChapterComment, ChapterCommentReactionType } from '../types/platform'
import BaseButton from './ui/BaseButton.vue'

const props = defineProps<{
  activity: Activity | null
}>()

const emit = defineEmits<{
  close: []
}>()

const authStore = useAuthStore()

const reactionOptions: Array<{ type: ChapterCommentReactionType; label: string; emoji: string }> = [
  { type: 'GOSTEI', label: 'gostei', emoji: '🙂' },
  { type: 'SOFRI', label: 'sofri', emoji: '😟' },
  { type: 'SURPRESO', label: 'surpresa', emoji: '😮' },
  { type: 'SUSPEITO', label: 'suspeito', emoji: '🤨' },
  { type: 'DISCUTIR', label: 'discutir', emoji: '💬' }
]

const isLoading = ref(false)
const isLocked = ref(false)
const comment = ref<ChapterComment | null>(null)
const errorMessage = ref('')
const dialog = ref<HTMLElement | null>(null)

watch(
  () => props.activity,
  async (activity) => {
    if (!activity?.metadata?.chapterId) {
      return
    }

    await loadComment(activity)
    await nextTick()
    dialog.value?.focus()
  }
)

async function loadComment(activity: Activity) {
  isLoading.value = true
  isLocked.value = false
  comment.value = null
  errorMessage.value = ''

  const chapterId = activity.metadata?.chapterId as string

  try {
    const response = await apiRequest<{ comments: ChapterComment[] }>(
      `/api/chapters/${chapterId}/comments`
    )
    comment.value =
      response.comments.find((item) => item.user.id === activity.actor?.id) ?? null
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      isLocked.value = true
    } else {
      errorMessage.value =
        error instanceof ApiError ? error.message : 'Nao foi possivel carregar o comentario.'
    }
  } finally {
    isLoading.value = false
  }
}

const isReacting = ref(false)

async function react(type: ChapterCommentReactionType) {
  if (!comment.value || isReacting.value) {
    return
  }

  isReacting.value = true

  try {
    await apiRequest(`/api/comments/${comment.value.id}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ type })
    })

    if (props.activity) {
      await loadComment(props.activity)
    }
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Nao foi possivel reagir.'
  } finally {
    isReacting.value = false
  }
}

function close() {
  emit('close')
}

const chapterNumber = () => props.activity?.metadata?.chapterNumber
const authorName = () =>
  props.activity?.actor?.displayName || props.activity?.actor?.login || 'Um membro'
const isOwnActivity = () =>
  Boolean(authStore.user?.id) && props.activity?.actor?.id === authStore.user?.id
</script>

<template>
  <Teleport to="body">
    <div v-if="activity" class="modal-backdrop" role="presentation" @click.self="close">
      <section
        ref="dialog"
        class="activity-modal glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-modal-title"
        tabindex="-1"
        @keydown.esc="close"
      >
        <p class="section-label">Capitulo {{ chapterNumber() }}</p>
        <h2 id="activity-modal-title">{{ activity.message }}</h2>

        <p v-if="isLoading" class="comment-muted">Carregando...</p>

        <p v-else-if="isLocked" class="spoiler-lock">
          Voce precisa concluir o capitulo {{ chapterNumber() }} para ver este comentario e reagir.
        </p>

        <p v-else-if="errorMessage" class="form-error">{{ errorMessage }}</p>

        <template v-else-if="comment">
          <div class="comment-author">
            <div class="avatar">
              {{ comment.user.displayName?.[0] || comment.user.login[0] }}
            </div>
            <div>
              <strong>{{ comment.user.displayName || comment.user.login }}</strong>
              <p>{{ new Date(comment.createdAt).toLocaleString('pt-BR') }}</p>
            </div>
          </div>

          <p class="comment-body">{{ comment.body }}</p>

          <div v-if="!isOwnActivity()" class="reaction-row" aria-label="Reagir ao comentario">
            <button
              v-for="reaction in reactionOptions"
              :key="reaction.type"
              type="button"
              class="emoji-reaction-button"
              :class="{ selected: comment.myReaction === reaction.type }"
              :aria-label="`Reagir com ${reaction.label}`"
              :disabled="isReacting"
              @click="react(reaction.type)"
            >
              <span aria-hidden="true">{{ reaction.emoji }}</span>
              <small>{{ comment.reactions[reaction.type] || 0 }}</small>
            </button>
          </div>

          <p v-else class="comment-muted">
            Este e o seu comentario. As reacoes de outros membros aparecem aqui.
          </p>
        </template>

        <p v-else class="comment-muted">
          {{ authorName() }} ainda nao deixou comentario no capitulo {{ chapterNumber() }}.
        </p>

        <div class="modal-actions">
          <BaseButton variant="outline" @click="close">Fechar</BaseButton>
        </div>
      </section>
    </div>
  </Teleport>
</template>
