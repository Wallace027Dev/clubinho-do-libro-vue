<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ActivityCommentModal from '../components/ActivityCommentModal.vue'
import { usePlatformStore } from '../stores/platformStore'
import type { Activity } from '../types/platform'

const platformStore = usePlatformStore()
const activities = computed(() => platformStore.clubState.activities)

const selectedActivity = ref<Activity | null>(null)
const searchTerm = ref('')

interface FeedFilter {
  key: string
  label: string
  types: string[] | null
}

const filters: FeedFilter[] = [
  { key: 'all', label: 'Tudo', types: null },
  { key: 'comments', label: 'Comentarios', types: ['CHAPTER_COMMENTED'] },
  { key: 'chapters', label: 'Capitulos', types: ['CHAPTER_STARTED', 'CHAPTER_FINISHED'] },
  { key: 'book', label: 'Livro', types: ['BOOK_SELECTED', 'BOOK_FINISHED', 'BOOK_REVIEWED'] },
  { key: 'members', label: 'Membros', types: ['MEMBER_CREATED', 'PROFILE_UPDATED'] }
]

const activeFilter = ref('all')

const typeLabels: Record<string, string> = {
  CHAPTER_COMMENTED: 'Comentario',
  CHAPTER_STARTED: 'Capitulo',
  CHAPTER_FINISHED: 'Capitulo',
  BOOK_SELECTED: 'Livro',
  BOOK_FINISHED: 'Livro',
  BOOK_REVIEWED: 'Avaliacao',
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

function openActivity(activity: Activity) {
  if (!isCommentActivity(activity)) {
    return
  }

  selectedActivity.value = activity
}

function closeActivity() {
  selectedActivity.value = null
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
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Feed do clube</p>
      <h2>Atividades da leitura</h2>
      <p>Toque em uma atividade de comentario para ler e reagir.</p>
    </div>

    <div class="feed-toolbar">
      <label class="feed-search">
        <span class="visually-hidden">Pesquisar no feed</span>
        <input v-model="searchTerm" type="search" placeholder="Pesquisar..." />
        <span class="feed-search-icon" aria-hidden="true">🔍</span>
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

    <div v-if="platformStore.isLoading && !activities.length" class="empty-state">
      <p>Carregando o feed do clube...</p>
    </div>

    <ol v-else-if="filteredActivities.length" class="feed-list">
      <li
        v-for="activity in filteredActivities"
        :key="activity.id"
        class="feed-card"
        :class="{ 'is-clickable': isCommentActivity(activity) }"
        :role="isCommentActivity(activity) ? 'button' : undefined"
        :tabindex="isCommentActivity(activity) ? 0 : undefined"
        :aria-label="isCommentActivity(activity) ? `Abrir ${activity.message}` : undefined"
        @click="openActivity(activity)"
        @keydown.enter.prevent="openActivity(activity)"
        @keydown.space.prevent="openActivity(activity)"
      >
        <div class="feed-card-top">
          <span class="feed-tag">{{ typeLabels[activity.type] ?? 'Atividade' }}</span>
          <time class="feed-date" :datetime="activity.createdAt">{{ activityDate(activity) }}</time>
        </div>
        <strong>{{ activity.message }}</strong>
        <p>{{ actorName(activity) }}</p>
      </li>
    </ol>

    <div v-else-if="activities.length" class="empty-state">
      <p>Nenhuma atividade combina com a busca ou o filtro.</p>
    </div>

    <div v-else class="empty-state">
      <p>O feed ainda esta vazio.</p>
    </div>
  </section>

  <ActivityCommentModal :activity="selectedActivity" @close="closeActivity" />
</template>
