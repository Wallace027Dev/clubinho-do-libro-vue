<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import DetailHeader from '../components/ui/DetailHeader.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import RatingInput from '../components/ui/RatingInput.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import { ApiError } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import { usePlatformStore } from '../stores/platformStore'
import { useUiStore } from '../stores/uiStore'
import type { Chapter, ChapterComment } from '../types/platform'
import { chapterTag } from '../utils/chapters'
import { reactionEmoji, reactionLabel } from '../utils/reactions'

const route = useRoute()
const authStore = useAuthStore()
const platformStore = usePlatformStore()
const uiStore = useUiStore()

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
const isEditingComment = ref(false)

// Horário de conclusão informado pelo membro (padrão: agora). Editável antes
// de concluir o capítulo; usa o fuso local do aparelho.
function toDatetimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const finishAt = ref(toDatetimeLocal(new Date()))

// Nota do capítulo. Agora é obrigatória na conclusão (fica registrada na
// atividade de fim de capítulo); continua editável depois.
const myRating = computed(() => chapter.value?.ratings?.[0]?.rating ?? null)
const ratingDraft = ref(0)
const finishRating = ref(0)
const isSavingRating = ref(false)

watch(
  myRating,
  (value) => {
    ratingDraft.value = value ?? 0
  },
  { immediate: true }
)

async function saveRating() {
  if (!chapter.value || ratingDraft.value < 1) {
    return
  }

  isSavingRating.value = true

  try {
    await platformStore.rateChapter(chapter.value.id, ratingDraft.value)
    uiStore.notify('Nota do capítulo salva!')
  } catch (error) {
    uiStore.notify(
      error instanceof ApiError ? error.message : 'Não foi possível salvar a nota.',
      'error'
    )
  } finally {
    isSavingRating.value = false
  }
}

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

// Ao entrar em "em leitura", propõe o horário atual como padrão de conclusão
// e recupera a nota anterior (caso o capítulo tenha sido reaberto).
watch(
  status,
  (currentStatus) => {
    if (currentStatus === 'STARTED') {
      finishAt.value = toDatetimeLocal(new Date())
      finishRating.value = myRating.value ?? 0
    }
  },
  { immediate: true }
)

async function loadComment(chapterId: string) {
  isLoadingComment.value = true

  try {
    const comments = await platformStore.loadChapterComments(chapterId)
    myComment.value = comments.find((comment) => comment.user.id === authStore.user?.id) ?? null
    commentBody.value = myComment.value?.body ?? ''
    // Com comentário salvo, mostramos a leitura; sem ele, o formulário fica aberto.
    isEditingComment.value = !myComment.value
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
  if (!chapter.value || finishRating.value < 1) return
  const id = chapter.value.id
  // Converte o horário local informado para ISO; sem valor, a API usa "agora".
  const when = finishAt.value ? new Date(finishAt.value).toISOString() : undefined
  void runProgressAction(
    () => platformStore.finishChapter(id, { rating: finishRating.value, finishedAt: when }),
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

function startEditingComment() {
  commentBody.value = myComment.value?.body ?? ''
  isEditingComment.value = true
}

function cancelEditingComment() {
  commentBody.value = myComment.value?.body ?? ''
  isEditingComment.value = false
}

async function submitComment() {
  if (!chapter.value || !commentBody.value.trim()) return

  isSubmittingComment.value = true

  try {
    const comments = await platformStore.submitChapterComment(
      chapter.value.id,
      commentBody.value
    )
    myComment.value = comments.find((comment) => comment.user.id === authStore.user?.id) ?? null
    commentBody.value = myComment.value?.body ?? ''
    // Salvou: fecha o formulário e volta para a leitura do comentário.
    isEditingComment.value = false
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

</script>

<template>
  <DetailHeader :title="chapter ? chapterTag(chapter) : 'Capítulo'" fallback="/chapters" />

  <EmptyState v-if="platformStore.isLoading && !chapter" message="Carregando capítulo..." />

  <SectionCard v-else-if="chapter" class="activity-detail">
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

      <template v-else-if="status === 'STARTED'">
        <p class="section-label">Sua nota do capítulo</p>
        <RatingInput v-model="finishRating" :size="26" v-slot="{ label }">
          <span class="rating-value">{{ finishRating >= 1 ? label : 'Toque nas estrelas' }}</span>
        </RatingInput>
        <p class="comment-muted">A nota é obrigatória para concluir e aparece no feed do clube.</p>

        <label class="finish-time-field">
          Horário da conclusão
          <input v-model="finishAt" type="datetime-local" />
        </label>
        <p class="comment-muted">Ajuste se terminou antes; o padrão é o horário atual.</p>

        <BaseButton :loading="isActing" :disabled="finishRating < 1" @click="finishChapter">
          Concluir capítulo
        </BaseButton>
      </template>

      <BaseButton v-else variant="outline" :loading="isActing" @click="reopenChapter">
        Voltar para "em leitura"
      </BaseButton>
    </div>

    <template v-if="status === 'FINISHED'">
      <div class="detail-divider" aria-hidden="true"></div>

      <p class="section-label">Minha nota do capítulo</p>

      <RatingInput v-model="ratingDraft" :size="26" v-slot="{ label }">
        <div class="rating-input-row">
          <span class="rating-value">{{ label }}</span>
          <BaseButton
            class="chapter-action"
            variant="secondary"
            :loading="isSavingRating"
            :disabled="ratingDraft < 1 || ratingDraft === myRating"
            @click="saveRating"
          >
            {{ myRating ? 'Atualizar nota' : 'Salvar nota' }}
          </BaseButton>
        </div>
      </RatingInput>

      <p v-if="!myRating" class="comment-muted">
        A nota é necessária para avaliar o livro no final; a média do clube aparece na página de
        avaliação por capítulo.
      </p>

      <div class="detail-divider" aria-hidden="true"></div>

      <p class="section-label">Meu comentário</p>

      <p v-if="isLoadingComment" class="comment-muted">Carregando seu comentário...</p>

      <template v-else-if="myComment && !isEditingComment">
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

        <BaseButton class="chapter-action" variant="secondary" @click="startEditingComment">
          Editar comentário
        </BaseButton>
      </template>

      <form v-else class="comment-inline-form" @submit.prevent="submitComment">
        <p v-if="!myComment" class="comment-muted">
          Você ainda não comentou este capítulo. O comentário aparece no feed para quem já
          concluiu.
        </p>

        <label class="visually-hidden" for="chapter-comment-input">Escreva um comentário</label>
        <textarea
          id="chapter-comment-input"
          v-model="commentBody"
          maxlength="420"
          rows="3"
          :placeholder="myComment ? 'Editar meu comentário...' : 'Escreva um comentário...'"
          required
        ></textarea>

        <div class="action-stack">
          <BaseButton
            type="submit"
            variant="secondary"
            :loading="isSubmittingComment"
            :disabled="!commentBody.trim()"
          >
            {{ myComment ? 'Salvar alterações' : 'Publicar comentário' }}
          </BaseButton>
          <BaseButton
            v-if="myComment"
            type="button"
            variant="outline"
            @click="cancelEditingComment"
          >
            Cancelar
          </BaseButton>
        </div>
      </form>
    </template>

    <p v-else class="spoiler-lock">
      Seu comentário deste capítulo abre depois que você concluir a leitura.
    </p>
  </SectionCard>

  <SectionCard v-else>
    <EmptyState message="Capítulo não encontrado no livro atual." />
  </SectionCard>
</template>
