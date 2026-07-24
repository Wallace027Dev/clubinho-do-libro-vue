<script setup lang="ts">
import { Bell } from 'lucide-vue-next'
import { defineAsyncComponent, watch } from 'vue'
import AppTabBar from './components/ui/AppTabBar.vue'
import AppToast from './components/ui/AppToast.vue'
import { syncPush } from './services/pushService'
import { useAuthStore } from './stores/authStore'
import { usePlatformStore } from './stores/platformStore'

const authStore = useAuthStore()
const platformStore = usePlatformStore()

// Ao autenticar (sessão restaurada ou login novo): reconcilia a assinatura de
// push e carrega o sininho (para o badge de não lidas).
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      void syncPush()
      void platformStore.loadNotifications()
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
      <h1 class="brand-logo">Clubinho do Libro</h1>

      <RouterLink
        v-if="authStore.isAuthenticated"
        to="/notifications"
        class="hero-bell"
        aria-label="Notificações"
      >
        <Bell :size="22" :stroke-width="2.2" />
        <span
          v-if="platformStore.unreadNotificationsCount"
          class="hero-bell-dot"
          :aria-label="`${platformStore.unreadNotificationsCount} não lidas`"
        ></span>
      </RouterLink>
    </section>

    <RouterView />

    <AppTabBar v-if="authStore.isAuthenticated" />
    <AppToast />
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
