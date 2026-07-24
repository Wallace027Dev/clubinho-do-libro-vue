<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ClickableCard from '../components/ui/ClickableCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import { useInfiniteScroll } from '../composables/useInfiniteScroll'
import { usePlatformStore } from '../stores/platformStore'
import type { Activity } from '../types/platform'

const router = useRouter()
const platformStore = usePlatformStore()

const isLoading = ref(true)
const sentinel = ref<HTMLElement | null>(null)
useInfiniteScroll(sentinel, () => platformStore.loadMoreNotifications())

onMounted(async () => {
  try {
    await platformStore.loadNotifications()
  } finally {
    isLoading.value = false
    // Abriu o sininho → zera o badge de não lidas.
    platformStore.markNotificationsSeen()
  }
})

function openNotification(activity: Activity) {
  if (activity.metadata?.chapterId) {
    void router.push(`/activity/${activity.id}`)
  }
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
    label="Notificações"
    title="O que precisa da sua atenção"
    subtitle="Comentários dos capítulos que você concluiu. Toque para ler e reagir."
  >
    <EmptyState
      v-if="isLoading && !platformStore.notifications.length"
      message="Carregando notificações..."
    />

    <ol v-else-if="platformStore.notifications.length" class="feed-list">
      <ClickableCard
        v-for="activity in platformStore.notifications"
        :key="activity.id"
        :clickable="Boolean(activity.metadata?.chapterId)"
        :aria-label="`Abrir ${activity.message}`"
        @activate="openNotification(activity)"
      >
        <div class="feed-card-top">
          <span class="feed-tag">Comentário</span>
          <time class="feed-date" :datetime="activity.createdAt">{{ activityDate(activity) }}</time>
        </div>
        <strong>{{ activity.message }}</strong>
        <p>{{ actorName(activity) }}</p>
      </ClickableCard>
    </ol>

    <EmptyState v-else message="Nenhuma notificação por aqui ainda." />

    <div v-if="platformStore.notificationsHasMore" ref="sentinel" class="list-sentinel">
      <span v-if="platformStore.isLoadingMoreNotifications">Carregando mais...</span>
    </div>
  </SectionCard>
</template>
