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
    errorMessage.value = error instanceof ApiError ? error.message : 'Não foi possível entrar.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <SectionCard
    label="Admin"
    title="Painel do clube"
    subtitle="A senha administrativa fica protegida no ambiente do servidor."
  >
    <form class="stack-form" @submit.prevent="handleSubmit">
      <label>
        Senha administrativa
        <PasswordInput v-model="password" autocomplete="current-password" required />
      </label>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <BaseButton type="submit" :loading="isSubmitting">
        {{ isSubmitting ? 'Verificando...' : 'Entrar no admin' }}
      </BaseButton>
    </form>

    <RouterLink class="text-link" to="/login">Voltar para login de membro</RouterLink>
  </SectionCard>
</template>
