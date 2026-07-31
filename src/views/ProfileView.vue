<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Settings } from 'lucide-vue-next'
import BaseButton from '../components/ui/BaseButton.vue'
import PasswordInput from '../components/ui/PasswordInput.vue'
import SkeletonLoader from '../components/ui/SkeletonLoader.vue'
import UserAvatar from '../components/ui/UserAvatar.vue'
import { ApiError } from '../services/apiClient'
import { disablePush, enablePush, pushStatus, type PushStatus } from '../services/pushService'
import { useAuthStore } from '../stores/authStore'
import { usePlatformStore } from '../stores/platformStore'
import { useUiStore } from '../stores/uiStore'

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

const pushState = ref<PushStatus>('unsupported')
const isTogglingPush = ref(false)

const displayNameOrLogin = computed(
  () => authStore.user?.displayName || authStore.user?.login || 'Membro'
)

async function enableNotifications() {
  isTogglingPush.value = true

  try {
    pushState.value = await enablePush()

    if (pushState.value === 'granted') {
      uiStore.notify('Notificações ativadas!')
    } else if (pushState.value === 'denied') {
      uiStore.notify('As notificações estão bloqueadas no navegador.', 'error')
    }
  } catch {
    uiStore.notify('Não foi possível ativar as notificações.', 'error')
  } finally {
    isTogglingPush.value = false
  }
}

async function disableNotifications() {
  isTogglingPush.value = true

  try {
    await disablePush()
    pushState.value = 'default'
    uiStore.notify('Notificações desativadas.')
  } finally {
    isTogglingPush.value = false
  }
}

function openAvatarModal() {
  if (avatarUrl.value) {
    isAvatarModalOpen.value = true
  }
}

function closeAvatarModal() {
  isAvatarModalOpen.value = false
}

onMounted(() => {
  void platformStore.loadProfileStats()
  pushState.value = pushStatus()
})

/**
 * Capítulos lidos e comentários vêm contados do servidor (`/api/profile/stats`),
 * somando todos os livros. Somar no cliente não funcionava: o payload do livro
 * atual não traz comentários e o histórico só tem livros finalizados, então a
 * conta de comentários ficava 0 durante toda a leitura.
 */
const stats = computed(() => platformStore.profileStats)

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
    await authStore.updateProfile({
      displayName: displayName.value,
      avatarUrl: avatarUrl.value
    })
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
    await authStore.changePassword(currentPassword.value, newPassword.value)

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
  <!-- Cabeçalho de carimbo: avatar, nome, @login e pills de atividade. -->
  <header class="profile-hero">
    <div class="profile-hero__top">
      <div class="profile-hero__avatar">
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
        <button
          type="button"
          class="profile-hero__badge"
          aria-label="Trocar foto"
          @click="pickPhoto"
        >
          <Plus :size="16" :stroke-width="2.6" />
        </button>
      </div>

      <span class="profile-hero__eyebrow">Meu perfil</span>
    </div>

    <h1 class="profile-hero__name">{{ displayNameOrLogin }}</h1>
    <p class="profile-hero__handle">@{{ authStore.user?.login }}</p>

    <div class="profile-hero__pills">
      <SkeletonLoader
        v-if="platformStore.isLoadingProfileStats"
        :columns="2"
        height="1.75rem"
        width="8.5rem"
        label="Carregando contadores do perfil"
      />
      <template v-else>
        <span class="profile-pill">{{ stats.chaptersRead }} Capítulos lidos</span>
        <span class="profile-pill">{{ stats.comments }} Comentários</span>
      </template>
    </div>
  </header>

  <input
    ref="fileInput"
    class="visually-hidden"
    type="file"
    accept="image/*"
    @change="onFileSelected"
  />

  <!-- Apelido (como o clube te chama). -->
  <form class="profile-name-field" @submit.prevent="saveProfile">
    <label class="section-label" for="profile-apelido">Como o clube te chama</label>
    <input id="profile-apelido" v-model="displayName" placeholder="Seu apelido no clube" />

    <p v-if="isDataUrlAvatar" class="comment-muted">
      A foto é comprimida no seu aparelho antes de salvar.
      <button type="button" class="text-link text-link--inline" @click="removePhoto">
        Remover foto
      </button>
    </p>

    <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

    <BaseButton type="submit" :loading="isSaving">
      {{ isSaving ? 'Salvando...' : 'Salvar perfil' }}
    </BaseButton>
  </form>

  <!-- Configurações: senha, notificações e conta. -->
  <section class="profile-config">
    <div class="profile-config__head">
      <h2>Configurações</h2>
      <span class="profile-config__gear" aria-hidden="true">
        <Settings :size="20" :stroke-width="2.2" />
      </span>
    </div>

    <form class="stack-form" @submit.prevent="changePassword">
      <p class="profile-config__label">Trocar senha</p>
      <label class="profile-config__field">
        Senha atual
        <PasswordInput v-model="currentPassword" autocomplete="current-password" required />
      </label>
      <label class="profile-config__field">
        Nova senha
        <PasswordInput v-model="newPassword" autocomplete="new-password" minlength="6" required />
      </label>

      <p v-if="passwordError" class="form-error">{{ passwordError }}</p>

      <BaseButton variant="secondary" type="submit" :loading="isChangingPassword">
        {{ isChangingPassword ? 'Alterando...' : 'Alterar senha' }}
      </BaseButton>
    </form>

    <div class="profile-config__notify">
      <p class="profile-config__label">Notificações</p>

      <p v-if="pushState === 'unsupported'" class="profile-config__note">
        Seu navegador não suporta notificações push.
      </p>
      <p v-else-if="pushState === 'denied'" class="profile-config__note">
        As notificações estão bloqueadas. Libere nas configurações do navegador para ativar.
      </p>
      <template v-else-if="pushState === 'granted'">
        <p class="profile-config__note">Ativadas neste aparelho.</p>
        <BaseButton variant="outline" :loading="isTogglingPush" @click="disableNotifications">
          Desativar notificações
        </BaseButton>
      </template>
      <BaseButton
        v-else
        variant="secondary"
        :loading="isTogglingPush"
        @click="enableNotifications"
      >
        Ativar notificações
      </BaseButton>
    </div>

    <div class="profile-config__account">
      <RouterLink v-if="authStore.isAdmin" class="text-link text-link--on-dark" to="/admin">
        Abrir painel do admin
      </RouterLink>
      <BaseButton variant="outline" :loading="isLoggingOut" @click="handleLogout">
        Sair da conta
      </BaseButton>
    </div>
  </section>

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
