<script setup lang="ts">
import RouletteWheel from './RouletteWheel.vue'
import { useRaffleStore } from '../stores/raffleStore'

const raffleStore = useRaffleStore()
</script>

<template>
  <section class="flow-card glass-panel roulette-step">
    <div class="flow-heading">
      <p class="section-label">Passo 2</p>
      <h2>Gire a roleta</h2>
      <p v-if="raffleStore.hasCurrentMonthBook">
        O sorteio deste mes ja foi concluido. O proximo libera em
        {{ raffleStore.nextRaffleMonthLabel }}.
      </p>
      <p v-else>A roleta desacelera e para no livro sorteado.</p>
    </div>

    <RouletteWheel />

    <div v-if="raffleStore.hasCurrentMonthBook" class="locked-raffle" role="status">
      <p class="section-label">Sorteio bloqueado</p>
      <h3>{{ raffleStore.monthlyBook?.book.title }}</h3>
      <p>Livro confirmado para o mes atual.</p>
    </div>

    <div class="action-stack">
      <button
        class="primary-action"
        type="button"
        :disabled="!raffleStore.canSpin"
        @click="raffleStore.spin"
      >
        {{
          raffleStore.hasCurrentMonthBook
            ? 'Bloqueado ate o proximo mes'
            : raffleStore.isSpinning
              ? 'Sorteando...'
              : 'Sortear'
        }}
      </button>

      <button class="secondary-action" type="button" @click="raffleStore.editBooks">
        Editar livros
      </button>

      <button class="ghost-action" type="button" @click="raffleStore.resetCurrentRaffle">
        Comecar de novo
      </button>
    </div>
  </section>
</template>
