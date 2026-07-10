<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import { ApiError, apiRequest } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import { usePlatformStore } from '../stores/platformStore'
import { useUiStore } from '../stores/uiStore'
import type { AuthUser } from '../types/platform'

const authStore = useAuthStore()
const platformStore = usePlatformStore()
const uiStore = useUiStore()
const router = useRouter()

const displayName = ref(authStore.user?.displayName ?? '')
const avatarUrl = ref(authStore.user?.avatarUrl ?? '')
const errorMessage = ref('')
const isSaving = ref(false)
const isLoggingOut = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const currentPassword = ref('')
const newPassword = ref('')
const passwordError = ref('')
const isChangingPassword = ref(false)

onMounted(() => {
  void platformStore.loadHome()
  void platformStore.loadHistory()
})

// Estatísticas pessoais calculadas com dados que o front já recebe.
const finishedChapters = computed(() => {
  const chapters = platformStore.clubState.currentBook?.chapters ?? []
  return {
    finished: chapters.filter((chapter) => chapter.progress[0]?.status === 'FINISHED').length,
    total: chapters.length
  }
})

const participatedBooks = computed(() => {
  const userId = authStore.user?.id
  if (!userId) return 0

  return platformStore.history.filter(
    (book) =>
      book.reviews.some((review) => review.user.id === userId) ||
      book.chapters.some((chapter) => chapter.comments.some((comment) => comment.user.id === userId))
  ).length
})

const avatarInitial = computed(
  () => authStore.user?.displayName?.[0] || authStore.user?.login?.[0] || '?'
)

const isDataUrlAvatar = computed(() => avatarUrl.value.startsWith('data:image/'))

function pickPhoto() {
  fileInput.value?.click()
}

/** Redimensiona a foto para 256px e comprime em JPEG (upload leve, sem storage). */
async function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]

  if (!file) return

  if (!file.type.startsWith('image/')) {
    uiStore.notify('Escolha um arquivo de imagem.', 'error')
    return
  }

  try {
    avatarUrl.value = await resizeToDataUrl(file, 256)
    uiStore.notify('Foto pronta! Toque em "Salvar perfil" para confirmar.')
  } catch {
    uiStore.notify('Não foi possível processar a imagem.', 'error')
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

function resizeToDataUrl(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)

      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Canvas indisponível.'))
        return
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Imagem inválida.'))
    }

    image.src = objectUrl
  })
}

function removePhoto() {
  avatarUrl.value = ''
}

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
    errorMessage.value = error instanceof ApiError ? error.message : 'Não foi possível salvar.'
  } finally {
    isSaving.value = false
  }
}

async function changePassword() {
  passwordError.value = ''

  if (newPassword.value.length < 6) {
    passwordError.value = 'A nova senha precisa ter pelo menos 6 caracteres.'
    return
  }

  isChangingPassword.value = true

  try {
    await apiRequest('/api/profile/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value
      })
    })

    currentPassword.value = ''
    newPassword.value = ''
    uiStore.notify('Senha alterada com sucesso!')
  } catch (error) {
    passwordError.value =
      error instanceof ApiError ? error.message : 'Não foi possível alterar a senha.'
  } finally {
    isChangingPassword.value = false
  }
}

async function handleLogout() {
  isLoggingOut.value = true

  try {
    await authStore.logout()
    await router.push('/login')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Perfil</p>
      <h2>Seu nome no clube</h2>
      <p>O login continua privado; os membros conhecem você pelo feed e pelo apelido.</p>
    </div>

    <form class="stack-form" @submit.prevent="saveProfile">
      <div class="profile-avatar-row">
        <div class="avatar profile-avatar">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Sua foto de perfil" />
          <template v-else>{{ avatarInitial }}</template>
        </div>

        <div class="action-stack">
          <BaseButton variant="secondary" @click="pickPhoto">
            {{ avatarUrl ? 'Trocar foto' : 'Escolher foto da galeria' }}
          </BaseButton>
          <BaseButton v-if="avatarUrl" variant="outline" @click="removePhoto">
            Remover foto
          </BaseButton>
        </div>

        <input
          ref="fileInput"
          class="visually-hidden"
          type="file"
          accept="image/*"
          @change="onFileSelected"
        />
      </div>

      <p v-if="isDataUrlAvatar" class="comment-muted">
        A foto é comprimida no seu aparelho antes de salvar.
      </p>

      <label>
        Apelido
        <input v-model="displayName" />
      </label>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

      <BaseButton type="submit" :loading="isSaving">
        {{ isSaving ? 'Salvando...' : 'Salvar perfil' }}
      </BaseButton>
    </form>
  </section>

  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Minha leitura</p>
      <h2>Estatísticas</h2>
    </div>

    <div class="profile-stats">
      <div class="profile-stat">
        <strong>{{ finishedChapters.finished }}/{{ finishedChapters.total || '—' }}</strong>
        <p>Capítulos do livro atual</p>
      </div>
      <div class="profile-stat">
        <strong>{{ participatedBooks }}</strong>
        <p>Livros em que participei</p>
      </div>
      <div class="profile-stat">
        <strong>{{ platformStore.history.length }}</strong>
        <p>Livros lidos pelo clube</p>
      </div>
    </div>
  </section>

  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Segurança</p>
      <h2>Trocar senha</h2>
    </div>

    <form class="stack-form" @submit.prevent="changePassword">
      <label>
        Senha atual
        <input v-model="currentPassword" autocomplete="current-password" required type="password" />
      </label>
      <label>
        Nova senha
        <input v-model="newPassword" autocomplete="new-password" minlength="6" required type="password" />
      </label>

      <p v-if="passwordError" class="form-error">{{ passwordError }}</p>

      <BaseButton variant="secondary" type="submit" :loading="isChangingPassword">
        {{ isChangingPassword ? 'Alterando...' : 'Alterar senha' }}
      </BaseButton>
    </form>
  </section>

  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Conta</p>
      <h2>Sessão e acessos</h2>
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
