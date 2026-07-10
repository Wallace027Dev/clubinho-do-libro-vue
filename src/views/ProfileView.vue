<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import { ApiError, apiRequest } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import type { AuthUser } from '../types/platform'

const authStore = useAuthStore()
const uiStore = useUiStore()
const router = useRouter()
const isLoggingOut = ref(false)

async function handleLogout() {
  isLoggingOut.value = true

  try {
    await authStore.logout()
    await router.push('/login')
  } finally {
    isLoggingOut.value = false
  }
}
const displayName = ref(authStore.user?.displayName ?? '')
const avatarUrl = ref(authStore.user?.avatarUrl ?? '')
const errorMessage = ref('')
const isSaving = ref(false)

async function saveProfile() {
  errorMessage.value = ''
  isSaving.value = true

  try {
    const response = await apiRequest<{ user: AuthUser }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        displayName: displayName.value,
        avatarUrl: avatarUrl.value
      })
    })

    authStore.setUser(response.user)
    uiStore.notify('Perfil atualizado com sucesso!')
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Nao foi possivel salvar.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Perfil</p>
      <h2>Seu nome no clube</h2>
      <p>O login continua privado; os membros conhecem voce pelo feed e pelo apelido.</p>
    </div>

    <form class="stack-form" @submit.prevent="saveProfile">
      <label>
        Apelido
        <input v-model="displayName" />
      </label>
      <label>
        URL da foto
        <input v-model="avatarUrl" inputmode="url" placeholder="https://..." />
      </label>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <BaseButton type="submit" :loading="isSaving">
        {{ isSaving ? 'Salvando...' : 'Salvar perfil' }}
      </BaseButton>
    </form>
  </section>

  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Conta</p>
      <h2>Sessao e acessos</h2>
    </div>

    <div class="action-stack">
      <RouterLink v-if="authStore.isAdmin" class="text-link" to="/admin">
        Abrir painel do admin
      </RouterLink>

      <BaseButton variant="outline" :loading="isLoggingOut" @click="handleLogout">
        Sair da conta
      </BaseButton>
    </div>
  </section>
</template>
