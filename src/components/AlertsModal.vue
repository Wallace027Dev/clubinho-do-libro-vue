<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import EmptyState from './ui/EmptyState.vue'
import { useInfiniteScroll } from '../composables/useInfiniteScroll'
import { usePlatformStore } from '../stores/platformStore'
import type { Activity } from '../types/platform'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const platformStore = usePlatformStore()
const isLoading = ref(false)

const sentinel = ref<HTMLElement | null>(null)
useInfiniteScroll(sentinel, () => platformStore.loadMoreAlerts())

// Ao abrir: recarrega os alertas e zera o badge de não lidos.
watch(
  () => props.open,
  async (open) => {
    if (!open) {
      return
    }

    isLoading.value = true
    try {
      await platformStore.loadAlerts()
    } finally {
      isLoading.value = false
      platformStore.markAlertsSeen()
    }
  }
)

function alertDate(activity: Activity) {
  const date = new Date(activity.createdAt)
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-backdrop alerts-backdrop"
      role="presentation"
      @click="emit('close')"
    >
      <div
        class="alerts-modal glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Avisos do clube"
        @click.stop
      >
        <header class="alerts-header">
          <h2>Avisos</h2>
          <button type="button" class="alerts-close" aria-label="Fechar" @click="emit('close')">
            <X :size="20" aria-hidden="true" />
          </button>
        </header>

        <div class="alerts-body">
          <EmptyState
            v-if="isLoading && !platformStore.alerts.length"
            message="Carregando avisos..."
          />

          <ol v-else-if="platformStore.alerts.length" class="alerts-list">
            <li v-for="activity in platformStore.alerts" :key="activity.id" class="alerts-item">
              <span class="alerts-text">{{ activity.message }}</span>
              <time class="alerts-time" :datetime="activity.createdAt">{{ alertDate(activity) }}</time>
            </li>
          </ol>

          <EmptyState v-else message="Nenhum aviso por enquanto." />

          <div v-if="platformStore.alertsHasMore" ref="sentinel" class="list-sentinel">
            <span v-if="platformStore.isLoadingMoreAlerts">Carregando mais...</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.alerts-backdrop {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 6vh 16px;
}

.alerts-modal {
  width: min(100%, 440px);
  max-height: 84vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  overflow: hidden;
}

.alerts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(46, 43, 30, 0.12);
}

.alerts-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.alerts-close {
  display: inline-flex;
  padding: 6px;
  border-radius: 50%;
  color: inherit;
}

.alerts-body {
  overflow-y: auto;
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px));
}

.alerts-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alerts-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.4);
}

.alerts-text {
  font-size: 0.92rem;
}

.alerts-time {
  font-size: 0.72rem;
  opacity: 0.7;
}
</style>
