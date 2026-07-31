<script setup lang="ts">
import { computed } from 'vue'
import RouletteWheel from './RouletteWheel.vue'
import { usePlatformStore } from '../stores/platformStore'
import { useRaffleStore } from '../stores/raffleStore'

const platformStore = usePlatformStore()
const raffleStore = useRaffleStore()

const isLockedByCurrentBook = computed(() => raffleStore.raffleLock === 'current-book-in-progress')
const currentBookTitle = computed(() => platformStore.clubState.currentBook?.book.title ?? '')

const spinLabel = computed(() => {
  if (isLockedByCurrentBook.value) {
    return 'Conclua o livro atual para sortear'
  }

  return raffleStore.isSpinning ? 'Sorteando...' : 'Sortear'
})
</script>

<template>
  <section class="flow-card glass-panel roulette-step">
    <div class="flow-heading">
      <p class="section-label">Passo 2</p>
      <h2>Gire a roleta</h2>
      <p v-if="isLockedByCurrentBook">
        O clube ainda está lendo um livro. O próximo sorteio libera quando ele for concluído.
      </p>
      <p v-else>A roleta desacelera e para no livro sorteado.</p>
    </div>

    <RouletteWheel />

    <div v-if="isLockedByCurrentBook" class="locked-raffle" role="status">
      <p class="section-label">Sorteio bloqueado</p>
      <h3>{{ currentBookTitle }}</h3>
      <p>Livro em andamento no clube.</p>
    </div>

    <div class="action-stack">
      <button
        class="primary-action"
        type="button"
        :disabled="!raffleStore.canSpin"
        @click="raffleStore.spin"
      >
        {{ spinLabel }}
      </button>

      <button class="secondary-action" type="button" @click="raffleStore.editBooks">
        Editar livros
      </button>

      <button class="ghost-action" type="button" @click="raffleStore.resetCurrentRaffle">
        Começar de novo
      </button>
    </div>
  </section>
</template>
