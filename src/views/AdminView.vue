<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseButton from '../components/ui/BaseButton.vue'
import { ApiError } from '../services/apiClient'
import { usePlatformStore } from '../stores/platformStore'
import { useUiStore } from '../stores/uiStore'

const platformStore = usePlatformStore()
const uiStore = useUiStore()
const memberLogin = ref('')
const memberPassword = ref('')
const memberDisplayName = ref('')
const bookTitle = ref('')
const bookAuthor = ref('')
const bookDescription = ref('')
const chapterNumber = ref(1)
const chapterTitle = ref('')
const errorMessage = ref('')

type AdminAction = 'member' | 'book' | 'chapter' | 'finish'
const pendingAction = ref<AdminAction | null>(null)

onMounted(async () => {
  await Promise.all([platformStore.loadHome(), platformStore.loadMembers()])
})

async function runAction(action: AdminAction, task: () => Promise<void>, fallbackError: string) {
  errorMessage.value = ''
  pendingAction.value = action

  try {
    await task()
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : fallbackError
  } finally {
    pendingAction.value = null
  }
}

function createMember() {
  return runAction(
    'member',
    async () => {
      await platformStore.createMember(memberLogin.value, memberPassword.value, memberDisplayName.value)
      memberLogin.value = ''
      memberPassword.value = ''
      memberDisplayName.value = ''
      uiStore.notify('Membro cadastrado com sucesso!')
    },
    'Não foi possível cadastrar.'
  )
}

function selectBook() {
  return runAction(
    'book',
    async () => {
      await platformStore.selectCurrentBook(bookTitle.value, bookAuthor.value, bookDescription.value)
      bookTitle.value = ''
      bookAuthor.value = ''
      bookDescription.value = ''
      uiStore.notify('Livro atual definido com sucesso!')
    },
    'Não foi possível definir o livro.'
  )
}

function createChapter() {
  return runAction(
    'chapter',
    async () => {
      await platformStore.createChapter(chapterNumber.value, chapterTitle.value)
      chapterNumber.value += 1
      chapterTitle.value = ''
      uiStore.notify('Capítulo cadastrado com sucesso!')
    },
    'Não foi possível cadastrar o capítulo.'
  )
}

function finishBook() {
  return runAction(
    'finish',
    async () => {
      await platformStore.finishCurrentBook()
      uiStore.notify('Livro finalizado. O próximo sorteio está liberado!')
    },
    'Não foi possível finalizar.'
  )
}

// --- Gestão de membros (item 8.2: desativar/reativar e redefinir senha) ---
const pendingMemberId = ref<string | null>(null)

async function runMemberAction(userId: string, task: () => Promise<void>, fallback: string) {
  pendingMemberId.value = userId

  try {
    await task()
  } catch (error) {
    uiStore.notify(error instanceof ApiError ? error.message : fallback, 'error')
  } finally {
    pendingMemberId.value = null
  }
}

function toggleMemberActive(member: { id: string | null; login: string; deactivatedAt?: string | null }) {
  if (!member.id) return

  const deactivating = !member.deactivatedAt

  if (
    deactivating &&
    !window.confirm(
      `Desativar ${member.login}? A pessoa não consegue mais entrar, mas os comentários e notas dela continuam no histórico do clube.`
    )
  ) {
    return
  }

  void runMemberAction(
    member.id,
    async () => {
      await platformStore.updateMember(member.id!, { deactivated: deactivating })
      uiStore.notify(deactivating ? 'Membro desativado.' : 'Membro reativado!')
    },
    'Não foi possível atualizar o membro.'
  )
}

function resetMemberPassword(member: { id: string | null; login: string }) {
  if (!member.id) return

  const newPassword = window.prompt(
    `Nova senha provisória para ${member.login} (mínimo 6 caracteres):`
  )

  if (newPassword === null) return

  if (newPassword.length < 6) {
    uiStore.notify('A senha precisa ter pelo menos 6 caracteres.', 'error')
    return
  }

  void runMemberAction(
    member.id,
    async () => {
      await platformStore.updateMember(member.id!, { newPassword })
      uiStore.notify(`Senha de ${member.login} redefinida. Avise a pessoa!`)
    },
    'Não foi possível redefinir a senha.'
  )
}

// --- Edição de capítulos (editar sempre; excluir só sem uso) ---
const editingChapterId = ref<string | null>(null)
const editNumber = ref(1)
const editTitle = ref('')
const pendingChapterId = ref<string | null>(null)

function startEditChapter(chapter: { id: string; number: number; title: string }) {
  editingChapterId.value = chapter.id
  editNumber.value = chapter.number
  editTitle.value = chapter.title
}

function cancelEditChapter() {
  editingChapterId.value = null
}

async function saveChapterEdit(chapterId: string) {
  pendingChapterId.value = chapterId

  try {
    await platformStore.updateChapter(chapterId, {
      number: editNumber.value,
      title: editTitle.value
    })
    editingChapterId.value = null
    uiStore.notify('Capítulo atualizado!')
  } catch (error) {
    uiStore.notify(
      error instanceof ApiError ? error.message : 'Não foi possível atualizar o capítulo.',
      'error'
    )
  } finally {
    pendingChapterId.value = null
  }
}

async function removeChapter(chapter: { id: string; number: number; title: string }) {
  if (!window.confirm(`Excluir o capítulo ${chapter.number} (${chapter.title})?`)) {
    return
  }

  pendingChapterId.value = chapter.id

  try {
    await platformStore.deleteChapter(chapter.id)
    uiStore.notify('Capítulo excluído.')
  } catch (error) {
    uiStore.notify(
      error instanceof ApiError ? error.message : 'Não foi possível excluir o capítulo.',
      'error'
    )
  } finally {
    pendingChapterId.value = null
  }
}
</script>

<template>
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Admin</p>
      <h2>Gerenciar clube</h2>
      <p>Cadastre membros, controle o livro atual e libere o próximo sorteio.</p>
    </div>

    <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
  </section>

  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Membros</p>
      <h2>Cadastrar usuário</h2>
    </div>

    <form class="stack-form" @submit.prevent="createMember">
      <label>
        Login
        <input v-model="memberLogin" required />
      </label>
      <label>
        Senha temporaria
        <input v-model="memberPassword" minlength="6" required type="password" />
      </label>
      <label>
        Apelido inicial
        <input v-model="memberDisplayName" />
      </label>
      <BaseButton type="submit" :loading="pendingAction === 'member'">
        Cadastrar membro
      </BaseButton>
    </form>

    <ul class="member-list">
      <li
        v-for="member in platformStore.members"
        :key="member.id || member.login"
        class="member-item"
        :class="{ 'member-item--inactive': member.deactivatedAt }"
      >
        <div class="avatar">
          <img v-if="member.avatarUrl" :src="member.avatarUrl" :alt="`Foto de ${member.login}`" />
          <template v-else>{{ member.displayName?.[0] || member.login[0] }}</template>
        </div>
        <div>
          <strong>{{ member.displayName || member.login }}</strong>
          <p>
            {{ member.login }}
            <span v-if="member.deactivatedAt" class="chapter-status chapter-status--not_started">
              Desativado
            </span>
          </p>
        </div>
        <div class="member-actions">
          <button
            type="button"
            class="filter-chip"
            :disabled="pendingMemberId === member.id"
            @click="resetMemberPassword(member)"
          >
            Redefinir senha
          </button>
          <button
            type="button"
            class="filter-chip"
            :disabled="pendingMemberId === member.id"
            @click="toggleMemberActive(member)"
          >
            {{ member.deactivatedAt ? 'Reativar' : 'Desativar' }}
          </button>
        </div>
      </li>
    </ul>
  </section>

  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Livro atual</p>
      <h2>{{ platformStore.clubState.currentBook?.book.title || 'Nenhum livro ativo' }}</h2>
    </div>

    <form v-if="!platformStore.clubState.currentBook" class="stack-form" @submit.prevent="selectBook">
      <label>
        Título
        <input v-model="bookTitle" required />
      </label>
      <label>
        Autor opcional
        <input v-model="bookAuthor" />
      </label>
      <label>
        Descrição opcional
        <textarea
          v-model="bookDescription"
          maxlength="1000"
          placeholder="Sinopse curta ou por que o clube escolheu este livro."
        ></textarea>
      </label>
      <BaseButton type="submit" :loading="pendingAction === 'book'">
        Definir livro atual
      </BaseButton>
    </form>

    <BaseButton v-else :loading="pendingAction === 'finish'" @click="finishBook">
      Finalizar livro atual
    </BaseButton>
  </section>

  <section v-if="platformStore.clubState.currentBook" class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Capítulos</p>
      <h2>Estrutura do livro</h2>
      <p>Cadastre os capítulos para liberar o progresso individual dos membros.</p>
    </div>

    <form class="stack-form" @submit.prevent="createChapter">
      <label>
        Número
        <input v-model.number="chapterNumber" min="1" required type="number" />
      </label>
      <label>
        Título do capítulo
        <input v-model="chapterTitle" required />
      </label>
      <BaseButton type="submit" :loading="pendingAction === 'chapter'">
        Cadastrar capítulo
      </BaseButton>
    </form>

    <ol
      v-if="platformStore.clubState.currentBook.chapters.length"
      class="chapter-list admin-chapter-list"
    >
      <li v-for="chapter in platformStore.clubState.currentBook.chapters" :key="chapter.id">
        <template v-if="editingChapterId === chapter.id">
          <div class="stack-form">
            <label>
              Número
              <input v-model.number="editNumber" min="1" required type="number" />
            </label>
            <label>
              Título
              <input v-model="editTitle" required />
            </label>
            <div class="member-actions">
              <button
                type="button"
                class="filter-chip active"
                :disabled="pendingChapterId === chapter.id"
                @click="saveChapterEdit(chapter.id)"
              >
                Salvar
              </button>
              <button type="button" class="filter-chip" @click="cancelEditChapter">
                Cancelar
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="chapter-card-row">
            <div>
              <span class="chapter-kicker">Capítulo {{ chapter.number }}</span>
              <strong>{{ chapter.title }}</strong>
            </div>
            <div class="member-actions">
              <button type="button" class="filter-chip" @click="startEditChapter(chapter)">
                Editar
              </button>
              <button
                type="button"
                class="filter-chip"
                :disabled="pendingChapterId === chapter.id"
                @click="removeChapter(chapter)"
              >
                Excluir
              </button>
            </div>
          </div>
        </template>
      </li>
    </ol>
  </section>
</template>
