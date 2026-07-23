<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import PasswordInput from '../components/ui/PasswordInput.vue'
import SectionCard from '../components/ui/SectionCard.vue'
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
  <SectionCard
    label="Entrada do membro"
    title="Acesse com seu convite"
    subtitle="Use o login e a senha enviados pelo administrador do clube."
  >
    <form class="stack-form" @submit.prevent="handleSubmit">
      <label>
        Login
        <input v-model="login" autocomplete="username" required />
      </label>

      <label>
        Senha
        <PasswordInput v-model="password" autocomplete="current-password" required />
      </label>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <BaseButton type="submit" :loading="isSubmitting">
        {{ isSubmitting ? 'Entrando...' : 'Entrar' }}
      </BaseButton>
    </form>
  </SectionCard>
</template>
