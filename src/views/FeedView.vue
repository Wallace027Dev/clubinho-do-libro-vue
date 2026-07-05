<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ActivityCommentModal from '../components/ActivityCommentModal.vue'
import { usePlatformStore } from '../stores/platformStore'
import type { Activity } from '../types/platform'

const platformStore = usePlatformStore()
const currentBook = computed(() => platformStore.clubState.currentBook)
const activities = computed(() => platformStore.clubState.activities)

const selectedActivity = ref<Activity | null>(null)

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
</script>

<template>
  <section class="glass-panel current-book">
    <div>
      <p class="section-label">Livro atual</p>
      <h2 v-if="currentBook">{{ currentBook.book.title }}</h2>
      <h2 v-else>Nenhum livro em andamento</h2>
      <p v-if="currentBook">
        Em leitura desde {{ new Date(currentBook.selectedAt).toLocaleDateString('pt-BR') }}.
      </p>
      <p v-else>Quando o administrador aceitar um sorteio, o livro aparece aqui.</p>
    </div>

    <RouterLink v-if="currentBook" class="text-link" to="/chapters">
      Ver meus capitulos
    </RouterLink>
  </section>

  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Feed do clube</p>
      <h2>Atividades da leitura</h2>
      <p>Toque em uma atividade de capitulo para ver o comentario e reagir.</p>
    </div>

    <ol v-if="activities.length" class="activity-list">
      <li
        v-for="activity in activities"
        :key="activity.id"
        :class="{ 'is-clickable': isCommentActivity(activity) }"
        :role="isCommentActivity(activity) ? 'button' : undefined"
        :tabindex="isCommentActivity(activity) ? 0 : undefined"
        :aria-label="isCommentActivity(activity) ? `Abrir ${activity.message}` : undefined"
        @click="openActivity(activity)"
        @keydown.enter.prevent="openActivity(activity)"
        @keydown.space.prevent="openActivity(activity)"
      >
        <div class="avatar">
          {{ activity.actor?.displayName?.[0] || activity.actor?.login?.[0] || 'C' }}
        </div>
        <div>
          <strong>{{ activity.message }}</strong>
          <p>{{ new Date(activity.createdAt).toLocaleString('pt-BR') }}</p>
        </div>
      </li>
    </ol>

    <div v-else class="empty-state">
      <p>O feed ainda esta vazio.</p>
    </div>
  </section>

  <ActivityCommentModal :activity="selectedActivity" @close="closeActivity" />
</template>
