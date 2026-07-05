<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ApiError } from '../services/apiClient'
import { usePlatformStore } from '../stores/platformStore'

const platformStore = usePlatformStore()
const memberLogin = ref('')
const memberPassword = ref('')
const memberDisplayName = ref('')
const bookTitle = ref('')
const bookAuthor = ref('')
const chapterNumber = ref(1)
const chapterTitle = ref('')
const feedback = ref('')
const errorMessage = ref('')

onMounted(async () => {
  await Promise.all([platformStore.loadHome(), platformStore.loadMembers()])
})

async function createMember() {
  feedback.value = ''
  errorMessage.value = ''

  try {
    await platformStore.createMember(memberLogin.value, memberPassword.value, memberDisplayName.value)
    memberLogin.value = ''
    memberPassword.value = ''
    memberDisplayName.value = ''
    feedback.value = 'Membro cadastrado.'
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Nao foi possivel cadastrar.'
  }
}

async function selectBook() {
  feedback.value = ''
  errorMessage.value = ''

  try {
    await platformStore.selectCurrentBook(bookTitle.value, bookAuthor.value)
    bookTitle.value = ''
    bookAuthor.value = ''
    feedback.value = 'Livro atual definido.'
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Nao foi possivel definir o livro.'
  }
}

async function createChapter() {
  feedback.value = ''
  errorMessage.value = ''

  try {
    await platformStore.createChapter(chapterNumber.value, chapterTitle.value)
    chapterNumber.value += 1
    chapterTitle.value = ''
    feedback.value = 'Capitulo cadastrado.'
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Nao foi possivel cadastrar o capitulo.'
  }
}

async function finishBook() {
  feedback.value = ''
  errorMessage.value = ''

  try {
    await platformStore.finishCurrentBook()
    feedback.value = 'Livro finalizado. O proximo sorteio esta liberado.'
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Nao foi possivel finalizar.'
  }
}
</script>

<template>
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Admin</p>
      <h2>Gerenciar clube</h2>
      <p>Cadastre membros, controle o livro atual e libere o proximo sorteio.</p>
    </div>

    <p v-if="feedback" class="form-success">{{ feedback }}</p>
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
      <button class="primary-action" type="submit">Cadastrar membro</button>
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
      <button class="primary-action" type="submit">Definir livro atual</button>
    </form>

    <button v-else class="primary-action" type="button" @click="finishBook">
      Finalizar livro atual
    </button>
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
      <button class="primary-action" type="submit">Cadastrar capitulo</button>
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
