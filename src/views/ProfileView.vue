<script setup lang="ts">
import { ref } from 'vue'
import { ApiError, apiRequest } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import type { AuthUser } from '../types/platform'

const authStore = useAuthStore()
const displayName = ref(authStore.user?.displayName ?? '')
const avatarUrl = ref(authStore.user?.avatarUrl ?? '')
const feedback = ref('')
const errorMessage = ref('')

async function saveProfile() {
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await apiRequest<{ user: AuthUser }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        displayName: displayName.value,
        avatarUrl: avatarUrl.value
      })
    })

    authStore.setUser(response.user)
    feedback.value = 'Perfil atualizado.'
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Nao foi possivel salvar.'
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

      <p v-if="feedback" class="form-success">{{ feedback }}</p>
      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <button class="primary-action" type="submit">Salvar perfil</button>
    </form>
  </section>
</template>
