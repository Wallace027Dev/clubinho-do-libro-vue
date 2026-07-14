<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ClickableCard from '../components/ui/ClickableCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import { usePlatformStore } from '../stores/platformStore'
import type { Activity } from '../types/platform'

const router = useRouter()
const platformStore = usePlatformStore()
const activities = computed(() => platformStore.clubState.activities)

const searchTerm = ref('')

interface FeedFilter {
  key: string
  label: string
  types: string[] | null
}

const filters: FeedFilter[] = [
  { key: 'all', label: 'Tudo', types: null },
  { key: 'comments', label: 'Comentários', types: ['CHAPTER_COMMENTED'] },
  { key: 'chapters', label: 'Capítulos', types: ['CHAPTER_STARTED', 'CHAPTER_FINISHED'] },
  { key: 'book', label: 'Livro', types: ['BOOK_SELECTED', 'BOOK_FINISHED', 'BOOK_REVIEWED'] },
  { key: 'members', label: 'Membros', types: ['MEMBER_CREATED', 'PROFILE_UPDATED'] }
]

const activeFilter = ref('all')

const typeLabels: Record<string, string> = {
  CHAPTER_COMMENTED: 'Comentário',
  CHAPTER_STARTED: 'Capítulo',
  CHAPTER_FINISHED: 'Capítulo',
  BOOK_SELECTED: 'Livro',
  BOOK_FINISHED: 'Livro',
  BOOK_REVIEWED: 'Avaliação',
  MEMBER_CREATED: 'Membro',
  PROFILE_UPDATED: 'Perfil'
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

const filteredActivities = computed(() => {
  const filter = filters.find((item) => item.key === activeFilter.value)
  const term = normalize(searchTerm.value.trim())

  return activities.value.filter((activity) => {
    if (filter?.types && !filter.types.includes(activity.type)) {
      return false
    }

    if (!term) {
      return true
    }

    const haystack = normalize(
      `${activity.message} ${activity.actor?.displayName ?? ''} ${activity.actor?.login ?? ''}`
    )
    return haystack.includes(term)
  })
})

onMounted(() => {
  void platformStore.loadHome()
})

function isCommentActivity(activity: Activity) {
  return activity.type === 'CHAPTER_COMMENTED' && Boolean(activity.metadata?.chapterId)
}

// Início/conclusão de leitura viram uma linha simples; comentários e demais
// atividades mantêm o card completo.
function isSimpleActivity(activity: Activity) {
  return activity.type === 'CHAPTER_STARTED' || activity.type === 'CHAPTER_FINISHED'
}

function openActivity(activity: Activity) {
  if (!isCommentActivity(activity)) {
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
  return activity.actor?.displayName || activity.actor?.login || 'Clubinho'
}
</script>

<template>
  <SectionCard
    label="Feed do clube"
    title="Atividades da leitura"
    subtitle="Toque em uma atividade de comentário para ler e reagir."
  >
    <div class="feed-toolbar">
      <label class="feed-search">
        <span class="visually-hidden">Pesquisar no feed</span>
        <input v-model="searchTerm" type="search" placeholder="Pesquisar..." />
        <Search class="feed-search-icon" :size="18" aria-hidden="true" />
      </label>

      <div class="filter-chips" role="group" aria-label="Filtrar por tipo de atividade">
        <button
          v-for="filter in filters"
          :key="filter.key"
          type="button"
          class="filter-chip"
          :class="{ active: activeFilter === filter.key }"
          :aria-pressed="activeFilter === filter.key"
          @click="activeFilter = filter.key"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <EmptyState
      v-if="platformStore.isLoading && !activities.length"
      message="Carregando o feed do clube..."
    />

    <ol v-else-if="filteredActivities.length" class="feed-list">
      <template v-for="activity in filteredActivities" :key="activity.id">
        <li v-if="isSimpleActivity(activity)" class="feed-simple">
          <span class="feed-simple-text">{{ activity.message }}</span>
          <time class="feed-date" :datetime="activity.createdAt">{{ activityDate(activity) }}</time>
        </li>

        <ClickableCard
          v-else
          :clickable="isCommentActivity(activity)"
          :aria-label="isCommentActivity(activity) ? `Abrir ${activity.message}` : undefined"
          @activate="openActivity(activity)"
        >
          <div class="feed-card-top">
            <span class="feed-tag">{{ typeLabels[activity.type] ?? 'Atividade' }}</span>
            <time class="feed-date" :datetime="activity.createdAt">{{ activityDate(activity) }}</time>
          </div>
          <strong>{{ activity.message }}</strong>
          <p>{{ actorName(activity) }}</p>
        </ClickableCard>
      </template>
    </ol>

    <EmptyState
      v-else-if="activities.length"
      message="Nenhuma atividade combina com a busca ou o filtro."
    />

    <EmptyState v-else message="O feed ainda está vazio." />
  </SectionCard>
</template>
