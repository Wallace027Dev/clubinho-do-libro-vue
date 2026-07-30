<script setup lang="ts">
import { Bell } from 'lucide-vue-next'
import { defineAsyncComponent, ref, watch } from 'vue'
import AlertsModal from './components/AlertsModal.vue'
import AppTabBar from './components/ui/AppTabBar.vue'
import AppToast from './components/ui/AppToast.vue'
import { syncPush } from './services/pushService'
import { useAuthStore } from './stores/authStore'
import { usePlatformStore } from './stores/platformStore'

const authStore = useAuthStore()
const platformStore = usePlatformStore()

const isAlertsOpen = ref(false)

// Ao autenticar (sessão restaurada ou login novo): reconcilia a assinatura de
// push e carrega os alertas (para o badge de não lidos no sininho).
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      void syncPush()
      void platformStore.loadAlerts()
    }
  },
  { immediate: true }
)

// Só existe em homologação; o import fica atrás da flag para não entrar no
// bundle de produção.
const isHomologation = __USE_MOCK_API__
const HomologationBadge = isHomologation
  ? defineAsyncComponent(() => import('./components/HomologationBadge.vue'))
  : null
</script>

<template>
  <div class="bg-drift" aria-hidden="true"></div>

  <main class="app-shell" :class="{ 'app-shell--with-tab-bar': authStore.isAuthenticated }">
    <section class="hero glass-panel">
      <h1 class="brand-logo">clubin. do libro</h1>

      <button
        v-if="authStore.isAuthenticated"
        type="button"
        class="hero-bell"
        aria-label="Avisos"
        @click="isAlertsOpen = true"
      >
        <Bell :size="22" :stroke-width="2.2" />
        <span
          v-if="platformStore.unreadAlertsCount"
          class="hero-bell-dot"
          :aria-label="`${platformStore.unreadAlertsCount} não lidos`"
        ></span>
      </button>
    </section>

    <RouterView />

    <AppTabBar v-if="authStore.isAuthenticated" />
    <AppToast />
    <AlertsModal :open="isAlertsOpen" @close="isAlertsOpen = false" />
    <component :is="HomologationBadge" v-if="HomologationBadge" />
  </main>
</template>

<style scoped>
.hero {
  position: relative;
}

.hero-bell {
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  color: inherit;
  background: rgba(255, 255, 255, 0.14);
}

.hero-bell:hover {
  background: rgba(255, 255, 255, 0.24);
}

.hero-bell-dot {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: #d9603f;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.12);
}
</style>
