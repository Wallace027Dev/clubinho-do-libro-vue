<script setup lang="ts">
import { Lock } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppSpinner from '../components/ui/AppSpinner.vue'
import ClickableCard from '../components/ui/ClickableCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import SkeletonLoader from '../components/ui/SkeletonLoader.vue'
import { useInfiniteScroll } from '../composables/useInfiniteScroll'
import { usePlatformStore } from '../stores/platformStore'
import type { Activity, ChapterCommentReactionType } from '../types/platform'
import { chapterTagFromMeta } from '../utils/chapters'
import { reactionEmoji } from '../utils/reactions'

const router = useRouter()
const platformStore = usePlatformStore()
const comments = computed(() => platformStore.clubState.activities)

// Scroll infinito: carrega os próximos comentários de 30 em 30.
const sentinel = ref<HTMLElement | null>(null)
useInfiniteScroll(sentinel, () => platformStore.loadMoreActivities())

// Só a primeira carga (sem nada em memória) mostra skeleton.
const hasLoaded = ref(false)
const showSkeleton = computed(() => !comments.value.length && !hasLoaded.value)

onMounted(async () => {
  try {
    await platformStore.loadHome()
  } finally {
    hasLoaded.value = true
  }
})

function openComment(activity: Activity) {
  if (activity.locked) {
    return
  }
  void router.push(`/activity/${activity.id}`)
}

function activityDate(activity: Activity) {
  return new Date(activity.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  })
}

function actorName(activity: Activity) {
  return activity.actor?.displayName || activity.actor?.login || 'Um membro'
}

function chapterLabel(activity: Activity) {
  return chapterTagFromMeta(activity.metadata?.chapterNumber, activity.metadata?.chapterTitle)
}

/** Só os tipos que têm reação (a contagem já vem sem os zerados). */
function reactionEntries(activity: Activity) {
  return Object.entries(activity.commentReactions ?? {}) as Array<
    [ChapterCommentReactionType, number]
  >
}
</script>

<template>
  <SectionCard
    label="Feed do clube"
    title="Comentários da leitura"
    subtitle="Comentários do livro atual. Os capítulos que você ainda não concluiu ficam com cadeado."
  >
    <SkeletonLoader
      v-if="showSkeleton"
      :rows="3"
      :columns="1"
      height="4.5rem"
      radius="16px"
      label="Carregando o feed do clube"
    />

    <ol v-else-if="comments.length" class="feed-list">
      <ClickableCard
        v-for="activity in comments"
        :key="activity.id"
        :clickable="!activity.locked"
        :class="{ 'is-locked': activity.locked }"
        :aria-label="`Abrir ${activity.message}`"
        @activate="openComment(activity)"
      >
        <div class="feed-card-top">
          <span class="feed-tag">{{ chapterLabel(activity) }}</span>
          <time class="feed-date" :datetime="activity.createdAt">{{ activityDate(activity) }}</time>
        </div>
        <strong>{{ actorName(activity) }}</strong>

        <p v-if="activity.locked" class="feed-lock">
          <Lock :size="14" aria-hidden="true" />
          Termine o capítulo para ler este comentário.
        </p>
        <p v-else-if="activity.bodyPreview" class="feed-card-preview">{{ activity.bodyPreview }}</p>

        <p v-if="activity.commentReactionTotal" class="feed-card-reactions">
          <span v-for="[type, count] in reactionEntries(activity)" :key="type">
            {{ reactionEmoji(type) }} {{ count }}
          </span>
        </p>
      </ClickableCard>
    </ol>

    <EmptyState
      v-else-if="!showSkeleton"
      message="Ainda não há comentários de outras pessoas neste livro."
    />

    <div v-if="platformStore.activitiesHasMore" ref="sentinel" class="list-sentinel">
      <AppSpinner v-if="platformStore.isLoadingMoreActivities" size="1.1rem" />
    </div>
  </SectionCard>
</template>
