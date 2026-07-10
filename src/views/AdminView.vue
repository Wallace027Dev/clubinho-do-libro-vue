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
    'Nao foi possivel cadastrar.'
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
    'Nao foi possivel definir o livro.'
  )
}

function createChapter() {
  return runAction(
    'chapter',
    async () => {
      await platformStore.createChapter(chapterNumber.value, chapterTitle.value)
      chapterNumber.value += 1
      chapterTitle.value = ''
      uiStore.notify('Capitulo cadastrado com sucesso!')
    },
    'Nao foi possivel cadastrar o capitulo.'
  )
}

function finishBook() {
  return runAction(
    'finish',
    async () => {
      await platformStore.finishCurrentBook()
      uiStore.notify('Livro finalizado. O proximo sorteio esta liberado!')
    },
    'Nao foi possivel finalizar.'
  )
}
</script>

<template>
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Admin</p>
      <h2>Gerenciar clube</h2>
      <p>Cadastre membros, controle o livro atual e libere o proximo sorteio.</p>
    </div>

    <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
  </section>

  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Membros</p>
      <h2>Cadastrar usuario</h2>
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
      <li v-for="member in platformStore.members" :key="member.id || member.login">
        <div class="avatar">{{ member.displayName?.[0] || member.login[0] }}</div>
        <div>
          <strong>{{ member.displayName || member.login }}</strong>
          <p>{{ member.login }}</p>
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
        Titulo
        <input v-model="bookTitle" required />
      </label>
      <label>
        Autor opcional
        <input v-model="bookAuthor" />
      </label>
      <label>
        Descricao opcional
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
      <p class="section-label">Capitulos</p>
      <h2>Estrutura do livro</h2>
      <p>Cadastre os capitulos para liberar o progresso individual dos membros.</p>
    </div>

    <form class="stack-form" @submit.prevent="createChapter">
      <label>
        Numero
        <input v-model.number="chapterNumber" min="1" required type="number" />
      </label>
      <label>
        Titulo do capitulo
        <input v-model="chapterTitle" required />
      </label>
      <BaseButton type="submit" :loading="pendingAction === 'chapter'">
        Cadastrar capitulo
      </BaseButton>
    </form>

    <ol
      v-if="platformStore.clubState.currentBook.chapters.length"
      class="chapter-list admin-chapter-list"
    >
      <li v-for="chapter in platformStore.clubState.currentBook.chapters" :key="chapter.id">
        <div>
          <span class="chapter-kicker">Capitulo {{ chapter.number }}</span>
          <strong>{{ chapter.title }}</strong>
        </div>
      </li>
    </ol>
  </section>
</template>
