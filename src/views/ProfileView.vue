<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '../components/ui/BaseButton.vue'
import SectionCard from '../components/ui/SectionCard.vue'
import UserAvatar from '../components/ui/UserAvatar.vue'
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

const isAvatarModalOpen = ref(false)

function openAvatarModal() {
  if (avatarUrl.value) {
    isAvatarModalOpen.value = true
  }
}

function closeAvatarModal() {
  isAvatarModalOpen.value = false
}

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

const isDataUrlAvatar = computed(() => avatarUrl.value.startsWith('data:image/'))

function pickPhoto() {
  fileInput.value?.click()
}

/**
 * Recorta a foto em um quadrado central e a reduz para 256px (JPEG leve, sem
 * storage). Assim uma imagem retangular vira uma foto de perfil quadrada e
 * centralizada, sem distorção.
 */
async function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]

  if (!file) return

  if (!file.type.startsWith('image/')) {
    uiStore.notify('Escolha um arquivo de imagem.', 'error')
    return
  }

  try {
    avatarUrl.value = await squareCropToDataUrl(file, 256)
    uiStore.notify('Foto pronta! Toque em "Salvar perfil" para confirmar.')
  } catch {
    uiStore.notify('Não foi possível processar a imagem.', 'error')
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

function squareCropToDataUrl(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      // Recorte central: pega o maior quadrado que cabe na imagem original.
      const side = Math.min(image.width, image.height)
      const sx = (image.width - side) / 2
      const sy = (image.height - side) / 2

      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size

      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Canvas indisponível.'))
        return
      }

      context.drawImage(image, sx, sy, side, side, 0, 0, size, size)
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
  <SectionCard
    label="Perfil"
    title="Seu nome no clube"
    subtitle="O login continua privado; os membros conhecem você pelo feed e pelo apelido."
  >
    <form class="stack-form" @submit.prevent="saveProfile">
      <div class="profile-avatar-row">
        <button
          type="button"
          class="avatar-trigger"
          :class="{ 'avatar-trigger--static': !avatarUrl }"
          :disabled="!avatarUrl"
          :aria-label="avatarUrl ? 'Ampliar foto de perfil' : undefined"
          @click="openAvatarModal"
        >
          <UserAvatar
            class="profile-avatar"
            :avatar-url="avatarUrl"
            :display-name="authStore.user?.displayName"
            :login="authStore.user?.login"
            alt="Sua foto de perfil"
          />
        </button>

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
  </SectionCard>

  <SectionCard label="Minha leitura" title="Estatísticas">
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
  </SectionCard>

  <SectionCard label="Segurança" title="Trocar senha">
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
  </SectionCard>

  <SectionCard label="Conta" title="Sessão e acessos">
    <div class="action-stack">
      <RouterLink v-if="authStore.isAdmin" class="text-link" to="/admin">
        Abrir painel do admin
      </RouterLink>

      <BaseButton variant="outline" :loading="isLoggingOut" @click="handleLogout">
        Sair da conta
      </BaseButton>
    </div>
  </SectionCard>

  <Teleport to="body">
    <div
      v-if="isAvatarModalOpen"
      class="modal-backdrop avatar-modal-backdrop"
      role="presentation"
      @click="closeAvatarModal"
    >
      <div
        class="avatar-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Foto de perfil ampliada"
        @click.stop
      >
        <img :src="avatarUrl" alt="Sua foto de perfil ampliada" />
        <button type="button" class="avatar-modal-close" aria-label="Fechar" @click="closeAvatarModal">
          Fechar
        </button>
      </div>
    </div>
  </Teleport>
</template>
