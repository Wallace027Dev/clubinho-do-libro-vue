<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import { ApiError } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const router = useRouter()
const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await authStore.adminLogin(password.value)
    await router.push('/admin')
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
      <p class="section-label">Admin</p>
      <h2>Painel do clube</h2>
      <p>A senha administrativa fica protegida no ambiente do servidor.</p>
    </div>

    <form class="stack-form" @submit.prevent="handleSubmit">
      <label>
        Senha administrativa
        <input v-model="password" autocomplete="current-password" required type="password" />
      </label>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <BaseButton type="submit" :loading="isSubmitting">
        {{ isSubmitting ? 'Verificando...' : 'Entrar no admin' }}
      </BaseButton>
    </form>

    <RouterLink class="text-link" to="/login">Voltar para login de membro</RouterLink>
  </section>
</template>
