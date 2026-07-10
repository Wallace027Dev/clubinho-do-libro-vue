<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
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
    errorMessage.value = error instanceof ApiError ? error.message : 'Não foi possível entrar.'
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

      <BaseButton type="submit" :loading="isSubmitting">
        {{ isSubmitting ? 'Entrando...' : 'Entrar' }}
      </BaseButton>
    </form>

    <RouterLink class="text-link" to="/login/admin">Sou o administrador do clube</RouterLink>
  </section>
</template>
