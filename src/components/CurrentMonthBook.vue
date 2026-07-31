<script setup lang="ts">
import { computed } from 'vue'
import { usePlatformStore } from '../stores/platformStore'
import { useRaffleStore } from '../stores/raffleStore'

const platformStore = usePlatformStore()
const raffleStore = useRaffleStore()

const currentBook = computed(() => platformStore.clubState.currentBook)

const readingSince = computed(() => {
  if (!currentBook.value) {
    return ''
  }

  return new Date(currentBook.value.selectedAt).toLocaleDateString('pt-BR')
})
</script>

<template>
  <section class="glass-panel current-book" aria-live="polite">
    <div>
      <p class="section-label">Livro atual</p>
      <h2 v-if="currentBook">{{ currentBook.book.title }}</h2>
      <h2 v-else>Nenhum livro em andamento</h2>
      <p v-if="currentBook">Em leitura desde {{ readingSince }}.</p>
      <p v-else>O vencedor aceito na roleta vira o livro atual do clube.</p>
    </div>

    <p v-if="raffleStore.raffleLock === 'current-book-in-progress'" class="lock-note" role="status">
      Sorteio travado enquanto houver livro em andamento. Conclua o livro no painel admin
      para liberar o próximo.
    </p>
  </section>
</template>
