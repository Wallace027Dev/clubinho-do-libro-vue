<script setup lang="ts">
import { computed } from 'vue'
import { formatMonthLabel } from '../services/raffleService'
import { useRaffleStore } from '../stores/raffleStore'

const raffleStore = useRaffleStore()

const monthLabel = computed(() => {
  if (!raffleStore.monthlyBook) {
    return ''
  }

  return formatMonthLabel(raffleStore.monthlyBook.month)
})
</script>

<template>
  <section class="glass-panel current-book" aria-live="polite">
    <div>
      <p class="section-label">Livro do mes</p>
      <h2 v-if="raffleStore.monthlyBook">{{ raffleStore.monthlyBook.book.title }}</h2>
      <h2 v-else>Nenhum livro escolhido ainda</h2>
      <p v-if="raffleStore.monthlyBook">{{ monthLabel }}</p>
      <p v-else>O resultado aceito da roleta aparece aqui.</p>
    </div>

    <button
      v-if="raffleStore.monthlyBook"
      class="ghost-action compact-action"
      type="button"
      @click="raffleStore.clearMonthlyBook"
    >
      Limpar livro do mes
    </button>

    <p v-if="raffleStore.hasCurrentMonthBook" class="lock-note" role="status">
      Sorteio encerrado neste mes. O proximo libera em
      {{ raffleStore.nextRaffleMonthLabel }}.
    </p>
  </section>
</template>
