<script setup lang="ts">
import { ArrowLeft, SendHorizontal } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import { ApiError, apiRequest } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import { usePlatformStore } from '../stores/platformStore'
import { useUiStore } from '../stores/uiStore'
import type { Chapter, ChapterComment, ChapterCommentReactionType } from '../types/platform'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const platformStore = usePlatformStore()
const uiStore = useUiStore()

const reactionOptions: Array<{ type: ChapterCommentReactionType; emoji: string; label: string }> = [
  { type: 'GOSTEI', emoji: '🙂', label: 'gostei' },
  { type: 'SOFRI', emoji: '😟', label: 'sofri' },
  { type: 'SURPRESO', emoji: '😮', label: 'surpresa' },
  { type: 'SUSPEITO', emoji: '🤨', label: 'suspeito' },
  { type: 'DISCUTIR', emoji: '💬', label: 'discutir' }
]

const chapter = computed<Chapter | null>(() => {
  const chapterId = String(route.params.chapterId)
  return (
    platformStore.clubState.currentBook?.chapters.find((item) => item.id === chapterId) ?? null
  )
})

const status = computed<'NOT_STARTED' | 'STARTED' | 'FINISHED'>(
  () => chapter.value?.progress[0]?.status ?? 'NOT_STARTED'
)

const statusLabels = {
  NOT_STARTED: 'Não iniciado',
  STARTED: 'Em leitura',
  FINISHED: 'Concluído'
} as const

const isActing = ref(false)
const myComment = ref<ChapterComment | null>(null)
const commentBody = ref('')
const isLoadingComment = ref(false)
const isSubmittingComment = ref(false)

onMounted(async () => {
  if (!platformStore.clubState.currentBook) {
    await platformStore.loadHome()
  }
})

// Carrega o comentário quando o capítulo está (ou passa a estar) concluído.
watch(
  [chapter, status],
  ([current, currentStatus]) => {
    if (current && currentStatus === 'FINISHED' && !myComment.value && !isLoadingComment.value) {
      void loadComment(current.id)
    }
  },
  { immediate: true }
)

async function loadComment(chapterId: string) {
  isLoadingComment.value = true

  try {
    const response = await apiRequest<{ comments: ChapterComment[] }>(
      `/api/chapters/${chapterId}/comments`
    )
    myComment.value =
      response.comments.find((comment) => comment.user.id === authStore.user?.id) ?? null
    commentBody.value = myComment.value?.body ?? ''
  } catch {
    // Sem comentário carregado; o formulario continua disponivel.
  } finally {
    isLoadingComment.value = false
  }
}

async function runProgressAction(action: () => Promise<void>, successMessage: string, fallback: string) {
  isActing.value = true

  try {
    await action()
    uiStore.notify(successMessage)
  } catch (error) {
    uiStore.notify(error instanceof ApiError ? error.message : fallback, 'error')
  } finally {
    isActing.value = false
  }
}

function startChapter() {
  if (!chapter.value) return
  const id = chapter.value.id
  void runProgressAction(
    () => platformStore.startChapter(id),
    'Capítulo iniciado. Boa leitura!',
    'Não foi possível iniciar o capítulo.'
  )
}

function finishChapter() {
  if (!chapter.value) return
  const id = chapter.value.id
  void runProgressAction(
    () => platformStore.finishChapter(id),
    'Capítulo concluído!',
    'Não foi possível concluir o capítulo.'
  )
}

function reopenChapter() {
  if (!chapter.value) return

  const confirmed = window.confirm(
    'Voltar este capítulo para "em leitura"? Seu comentário continua salvo, mas ele fica bloqueado para você até concluir de novo.'
  )

  if (!confirmed) return

  const id = chapter.value.id
  void runProgressAction(
    () => platformStore.reopenChapter(id),
    'Capítulo voltou para "em leitura".',
    'Não foi possível desfazer a conclusão.'
  )
}

async function submitComment() {
  if (!chapter.value || !commentBody.value.trim()) return

  isSubmittingComment.value = true

  try {
    const response = await apiRequest<{ comments: ChapterComment[] }>(
      `/api/chapters/${chapter.value.id}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ body: commentBody.value })
      }
    )
    myComment.value =
      response.comments.find((comment) => comment.user.id === authStore.user?.id) ?? null
    commentBody.value = myComment.value?.body ?? ''
    uiStore.notify('Comentário salvo com sucesso!')
  } catch (error) {
    uiStore.notify(
      error instanceof ApiError ? error.message : 'Não foi possível salvar o comentário.',
      'error'
    )
  } finally {
    isSubmittingComment.value = false
  }
}

function reactionEmoji(type: ChapterCommentReactionType) {
  return reactionOptions.find((reaction) => reaction.type === type)?.emoji ?? '🙂'
}

function reactionLabel(type: ChapterCommentReactionType) {
  return reactionOptions.find((reaction) => reaction.type === type)?.label ?? 'reação'
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }

  void router.push('/chapters')
}
</script>

<template>
  <header class="detail-header glass-panel">
    <button class="back-button" type="button" aria-label="Voltar" @click="goBack"><ArrowLeft :size="20" /></button>
    <h2>{{ chapter ? `Capítulo ${chapter.number}` : 'Capítulo' }}</h2>
  </header>

  <div v-if="platformStore.isLoading && !chapter" class="empty-state">
    <p>Carregando capítulo...</p>
  </div>

  <section v-else-if="chapter" class="flow-card glass-panel activity-detail">
    <div>
      <p class="section-label">{{ platformStore.clubState.currentBook?.book.title }}</p>
      <h2>{{ chapter.title }}</h2>
      <p class="detail-meta">
        Status:
        <span class="chapter-status" :class="`chapter-status--${status.toLowerCase()}`">
          {{ statusLabels[status] }}
        </span>
      </p>
    </div>

    <div class="action-stack">
      <BaseButton v-if="status === 'NOT_STARTED'" variant="secondary" :loading="isActing" @click="startChapter">
        Iniciar leitura
      </BaseButton>

      <BaseButton v-else-if="status === 'STARTED'" :loading="isActing" @click="finishChapter">
        Concluir capítulo
      </BaseButton>

      <BaseButton v-else variant="outline" :loading="isActing" @click="reopenChapter">
        Voltar para "em leitura"
      </BaseButton>
    </div>

    <template v-if="status === 'FINISHED'">
      <div class="detail-divider" aria-hidden="true"></div>

      <p class="section-label">Meu comentário</p>

      <p v-if="isLoadingComment" class="comment-muted">Carregando seu comentário...</p>

      <template v-else-if="myComment">
        <p class="comment-body">{{ myComment.body }}</p>

        <div
          v-if="myComment.reactionTotal"
          class="reaction-row"
          :aria-label="`${myComment.reactionTotal} reações no seu comentário`"
        >
          <span
            v-for="(reaction, index) in myComment.recentReactions"
            :key="`${reaction.type}-${reaction.updatedAt}-${index}`"
            class="reaction-bubble"
            :title="reactionLabel(reaction.type)"
          >
            {{ reactionEmoji(reaction.type) }}
          </span>
          <span
            v-if="myComment.reactionTotal > myComment.recentReactions.length"
            class="reaction-count"
          >
            +{{ myComment.reactionTotal - myComment.recentReactions.length }}
          </span>
        </div>

        <p v-else class="comment-muted">Seu comentário ainda não recebeu reações.</p>
      </template>

      <p v-else class="comment-muted">
        Você ainda não comentou este capítulo. Escreva abaixo — o comentário aparece no feed para
        quem já concluiu.
      </p>
    </template>

    <p v-else class="spoiler-lock">
      Seu comentário deste capítulo abre depois que você concluir a leitura.
    </p>
  </section>

  <section v-else class="flow-card glass-panel">
    <div class="empty-state">
      <p>Capítulo não encontrado no livro atual.</p>
    </div>
  </section>

  <div v-if="chapter && status === 'FINISHED'" class="comment-dock-spacer" aria-hidden="true"></div>

  <form v-if="chapter && status === 'FINISHED'" class="comment-dock glass-panel" @submit.prevent="submitComment">
    <label class="visually-hidden" for="chapter-comment-input">Escreva um comentário</label>
    <input
      id="chapter-comment-input"
      v-model="commentBody"
      maxlength="420"
      :placeholder="myComment ? 'Editar meu comentário...' : 'Escreva um comentário...'"
      required
    />
    <button
      class="comment-dock-send"
      type="submit"
      :disabled="isSubmittingComment"
      aria-label="Salvar comentário"
    >
      <SendHorizontal :size="18" />
    </button>
  </form>
</template>
