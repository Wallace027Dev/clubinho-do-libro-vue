<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppSpinner from '../components/ui/AppSpinner.vue'
import ClickableCard from '../components/ui/ClickableCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import SkeletonBlock from '../components/ui/SkeletonBlock.vue'
import { useInfiniteScroll } from '../composables/useInfiniteScroll'
import { usePlatformStore } from '../stores/platformStore'
import type { Activity } from '../types/platform'

const router = useRouter()
const platformStore = usePlatformStore()
const comments = computed(() => platformStore.clubState.activities)

// Scroll infinito: carrega os próximos comentários de 30 em 30.
const sentinel = ref<HTMLElement | null>(null)
useInfiniteScroll(sentinel, () => platformStore.loadMoreActivities())

// Só a primeira carga (sem nada em memória) mostra skeleton.
const hasLoaded = ref(false)
const showSkeleton = computed(() => !comments.value.length && !hasLoaded.value)

const searchTerm = ref('')

function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

const filteredComments = computed(() => {
  const term = normalize(searchTerm.value.trim())
  if (!term) {
    return comments.value
  }

  return comments.value.filter((activity) => {
    const haystack = normalize(
      `${activity.message} ${activity.actor?.displayName ?? ''} ${activity.actor?.login ?? ''}`
    )
    return haystack.includes(term)
  })
})

onMounted(async () => {
  try {
    await platformStore.loadHome()
  } finally {
    hasLoaded.value = true
  }
})

function openComment(activity: Activity) {
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
</script>

<template>
  <SectionCard
    label="Feed do clube"
    title="Comentários da leitura"
    subtitle="Comentários dos capítulos que você já concluiu. Toque para ler e reagir."
  >
    <label class="feed-search">
      <span class="visually-hidden">Pesquisar comentários</span>
      <input v-model="searchTerm" type="search" placeholder="Pesquisar..." />
      <Search class="feed-search-icon" :size="18" aria-hidden="true" />
    </label>

    <div v-if="showSkeleton" class="feed-list" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="feed-card feed-card--skeleton">
        <SkeletonBlock width="6rem" height="0.9rem" radius="6px" />
        <SkeletonBlock width="80%" height="1.1rem" />
        <SkeletonBlock width="30%" height="0.8rem" />
      </div>
    </div>
    <p v-if="showSkeleton" class="visually-hidden" role="status">Carregando o feed do clube...</p>

    <ol v-else-if="filteredComments.length" class="feed-list">
      <ClickableCard
        v-for="activity in filteredComments"
        :key="activity.id"
        :aria-label="`Abrir ${activity.message}`"
        @activate="openComment(activity)"
      >
        <div class="feed-card-top">
          <span class="feed-tag">Comentário</span>
          <time class="feed-date" :datetime="activity.createdAt">{{ activityDate(activity) }}</time>
        </div>
        <strong>{{ activity.message }}</strong>
        <p>{{ actorName(activity) }}</p>
      </ClickableCard>
    </ol>

    <EmptyState
      v-else-if="comments.length"
      message="Nenhum comentário combina com a busca."
    />

    <EmptyState
      v-else-if="!showSkeleton"
      message="Ainda não há comentários de outras pessoas nos capítulos que você concluiu."
    />

    <div v-if="platformStore.activitiesHasMore" ref="sentinel" class="list-sentinel">
      <AppSpinner v-if="platformStore.isLoadingMoreActivities" size="1.1rem" />
    </div>
  </SectionCard>
</template>
