<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const router = useRouter()
const login = ref('')
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await authStore.login(login.value, password.value)
    await router.push('/')
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Nao foi possivel entrar.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Entrada do membro</p>
      <h2>Acesse com seu convite</h2>
      <p>Use o login e a senha enviados pelo administrador do clube.</p>
    </div>

    <form class="stack-form" @submit.prevent="handleSubmit">
      <label>
        Login
        <input v-model="login" autocomplete="username" required />
      </label>

      <label>
        Senha
        <input v-model="password" autocomplete="current-password" required type="password" />
      </label>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <button class="primary-action" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Entrando...' : 'Entrar' }}
      </button>
    </form>
  </section>
</template>
