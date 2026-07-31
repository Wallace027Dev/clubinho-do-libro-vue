<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import DetailHeader from '../components/ui/DetailHeader.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import UserAvatar from '../components/ui/UserAvatar.vue'
import { ApiError } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import { usePlatformStore } from '../stores/platformStore'
import type { Activity, ChapterComment, ChapterCommentReactionType } from '../types/platform'
import { chapterTagFromMeta } from '../utils/chapters'
import { reactionOptions } from '../utils/reactions'

const route = useRoute()
const authStore = useAuthStore()
const platformStore = usePlatformStore()

const isLoading = ref(true)
const isLocked = ref(false)
const isReacting = ref(false)
const comment = ref<ChapterComment | null>(null)
const errorMessage = ref('')

const activity = computed<Activity | null>(() => {
  const activityId = String(route.params.activityId)
  return platformStore.clubState.activities.find((item) => item.id === activityId) ?? null
})

const chapterNumber = computed(() => activity.value?.metadata?.chapterNumber)

// "Prólogo"/"Epílogo"/"Capítulo 5" — e a variante minúscula para meio de
// frase ("prólogo", "capítulo 5").
const chapterLabel = computed(() =>
  chapterTagFromMeta(activity.value?.metadata?.chapterNumber, activity.value?.metadata?.chapterTitle)
)
const chapterLabelBare = computed(() => chapterLabel.value.toLowerCase())
const authorName = computed(
  () => activity.value?.actor?.displayName || activity.value?.actor?.login || 'Um membro'
)
const isOwnActivity = computed(
  () => Boolean(authStore.user?.id) && activity.value?.actor?.id === authStore.user?.id
)

const activityDate = computed(() => {
  if (!activity.value) {
    return ''
  }

  const date = new Date(activity.value.createdAt)
  return `${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
})

onMounted(async () => {
  // Ao abrir por link direto (ou recarregar), o feed ainda não está na
  // memória: carrega o estado do clube antes de procurar a atividade.
  if (!platformStore.clubState.activities.length) {
    try {
      await platformStore.loadHome()
    } catch {
      // O erro aparece no estado de "atividade não encontrada" abaixo.
    }
  }

  await loadComment()
})

async function loadComment() {
  const chapterId = activity.value?.metadata?.chapterId

  if (!chapterId) {
    isLoading.value = false
    return
  }

  isLoading.value = true
  isLocked.value = false
  errorMessage.value = ''

  try {
    const comments = await platformStore.loadChapterComments(chapterId)
    comment.value = comments.find((item) => item.user.id === activity.value?.actor?.id) ?? null
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      isLocked.value = true
    } else {
      errorMessage.value =
        error instanceof ApiError ? error.message : 'Não foi possível carregar o comentário.'
    }
  } finally {
    isLoading.value = false
  }
}

async function react(type: ChapterCommentReactionType) {
  if (!comment.value || isReacting.value) {
    return
  }

  isReacting.value = true

  try {
    await platformStore.reactToComment(comment.value.id, type)
    await loadComment()
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Não foi possível reagir.'
  } finally {
    isReacting.value = false
  }
}

</script>

<template>
  <DetailHeader :title="activity?.message ?? 'Atividade'" fallback="/feed" />

  <SectionCard v-if="activity" class="activity-detail">
    <div>
      <p class="detail-meta">
        de <strong>{{ authorName }}</strong>
      </p>
      <p class="detail-meta">{{ activityDate }}</p>
    </div>

    <div class="detail-divider" aria-hidden="true"></div>

    <p v-if="chapterNumber != null" class="section-label">{{ chapterLabel }}</p>

    <p v-if="isLoading" class="comment-muted">Carregando comentário...</p>

    <p v-else-if="isLocked" class="spoiler-lock">
      Você precisa concluir o {{ chapterLabelBare }} para ver este comentário e reagir.
    </p>

    <p v-else-if="errorMessage" class="form-error">{{ errorMessage }}</p>

    <template v-else-if="comment">
      <div class="comment-author">
        <UserAvatar
          :avatar-url="comment.user.avatarUrl"
          :display-name="comment.user.displayName"
          :login="comment.user.login"
        />
        <div>
          <strong>{{ comment.user.displayName || comment.user.login }}</strong>
          <p>{{ new Date(comment.createdAt).toLocaleString('pt-BR') }}</p>
        </div>
      </div>

      <p class="comment-body">{{ comment.body }}</p>

      <div v-if="!isOwnActivity" class="reaction-row" aria-label="Reagir ao comentário">
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
        Este é o seu comentário. As reações de outros membros aparecem aqui.
      </p>
    </template>

    <p v-else class="comment-muted">
      {{ authorName }} ainda não deixou comentário no {{ chapterLabelBare }}.
    </p>
  </SectionCard>

  <SectionCard v-else-if="!platformStore.isLoading">
    <EmptyState message="Atividade não encontrada. Ela pode ter saído do feed recente do clube." />
  </SectionCard>
</template>
