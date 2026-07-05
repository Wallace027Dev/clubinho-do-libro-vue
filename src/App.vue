<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  await router.push('/login')
}
</script>

<template>
  <main class="app-shell">
    <section class="hero glass-panel">
      <h1 class="brand-logo">Clubinho do Libro</h1>
    </section>

    <nav v-if="authStore.isAuthenticated" class="app-nav glass-panel" aria-label="Navegacao principal">
      <RouterLink to="/">Feed</RouterLink>
      <RouterLink to="/chapters">Capitulos</RouterLink>
      <RouterLink to="/history">Livros lidos</RouterLink>
      <RouterLink to="/profile">Perfil</RouterLink>
      <RouterLink v-if="authStore.isAdmin" to="/admin">Admin</RouterLink>
      <button type="button" @click="handleLogout">Sair</button>
    </nav>

    <RouterView />
  </main>
</template>
