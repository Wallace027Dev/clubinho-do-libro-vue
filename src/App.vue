<script setup lang="ts">
import { defineAsyncComponent, watch } from 'vue'
import AppTabBar from './components/ui/AppTabBar.vue'
import AppToast from './components/ui/AppToast.vue'
import { syncPush } from './services/pushService'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()

// Ao autenticar (sessão restaurada ou login novo), reconcilia a assinatura de
// push com o usuário atual. No-op sem permissão/suporte ou na homologação.
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      void syncPush()
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
    </section>

    <RouterView />

    <AppTabBar v-if="authStore.isAuthenticated" />
    <AppToast />
    <component :is="HomologationBadge" v-if="HomologationBadge" />
  </main>
</template>
