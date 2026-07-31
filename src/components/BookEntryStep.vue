<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRaffleStore } from '../stores/raffleStore'

const raffleStore = useRaffleStore()
const title = ref('')

const isLockedByCurrentBook = computed(() => raffleStore.raffleLock === 'current-book-in-progress')

function handleSubmit() {
  raffleStore.addBook(title.value)
  title.value = ''
}
</script>

<template>
  <section class="flow-card glass-panel">
    <div class="flow-heading">
      <p class="section-label">Passo 1</p>
      <h2>Cadastre os livros</h2>
      <p>Inclua pelo menos duas opções para criar a roleta.</p>
    </div>

    <form class="book-form" @submit.prevent="handleSubmit">
      <label for="book-title">Nome do livro</label>
      <div class="input-row">
        <input
          id="book-title"
          v-model="title"
          type="text"
          autocomplete="off"
          placeholder="Ex.: Dom Casmurro"
        />
        <button class="icon-button" type="submit" aria-label="Adicionar livro">+</button>
      </div>
    </form>

    <ul v-if="raffleStore.books.length" class="book-list">
      <li v-for="book in raffleStore.books" :key="book.id">
        <span class="book-list-title">
          <span class="book-color-dot" :style="{ backgroundColor: book.color }" aria-hidden="true"></span>
          {{ book.title }}
        </span>
        <button type="button" @click="raffleStore.removeBook(book.id)">Remover</button>
      </li>
    </ul>

    <div v-else class="empty-state">
      <p>A lista ainda está vazia.</p>
    </div>

    <button
      class="primary-action"
      type="button"
      :disabled="!raffleStore.canConfirmBooks"
      @click="raffleStore.confirmBooks"
    >
      {{ isLockedByCurrentBook ? 'Conclua o livro atual para sortear' : 'Confirmar livros' }}
    </button>

    <p v-if="isLockedByCurrentBook" class="lock-note" role="status">
      O clube ainda está lendo um livro. Conclua o livro atual no painel admin para
      liberar o próximo sorteio.
    </p>
  </section>
</template>
