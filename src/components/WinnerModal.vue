<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRaffleStore } from '../stores/raffleStore'

const raffleStore = useRaffleStore()
const acceptButton = ref<HTMLButtonElement | null>(null)

watch(
  () => raffleStore.isWinnerModalOpen,
  async (isOpen) => {
    if (!isOpen) {
      return
    }

    await nextTick()
    acceptButton.value?.focus()
  }
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="raffleStore.isWinnerModalOpen && raffleStore.selectedBook"
      class="modal-backdrop"
      role="presentation"
    >
      <section
        class="winner-modal glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="winner-title"
        aria-describedby="winner-description"
        tabindex="-1"
        @keydown.esc="raffleStore.closeWinnerModal"
      >
        <p class="section-label">Livro sorteado</p>
        <h2 id="winner-title" class="book-title-with-color">
          <span
            class="book-color-dot"
            :style="{ backgroundColor: raffleStore.selectedBook.color }"
            aria-hidden="true"
          ></span>
          {{ raffleStore.selectedBook.title }}
        </h2>
        <p id="winner-description">Esse sera o livro do mes?</p>

        <div class="modal-actions">
          <button
            ref="acceptButton"
            class="primary-action"
            type="button"
            @click="raffleStore.acceptWinner"
          >
            Aceitar
          </button>
          <button class="secondary-action" type="button" @click="raffleStore.reroll">
            Sortear novamente
          </button>
          <button class="ghost-action" type="button" @click="raffleStore.closeWinnerModal">
            Fechar
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
