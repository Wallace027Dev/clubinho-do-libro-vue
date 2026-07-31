<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { ApiError } from '../services/apiClient'
import { useRaffleStore } from '../stores/raffleStore'
import { useUiStore } from '../stores/uiStore'

const raffleStore = useRaffleStore()
const uiStore = useUiStore()
const acceptButton = ref<HTMLButtonElement | null>(null)

// Aceitar grava o livro atual no servidor: pode falhar (ex.: 409 se outro admin
// já definiu um livro), então o erro precisa aparecer para quem clicou.
async function acceptWinner() {
  try {
    await raffleStore.acceptWinner()
    uiStore.notify('Livro atual definido! O sorteio libera quando ele for concluído.')
  } catch (error) {
    uiStore.notify(
      error instanceof ApiError ? error.message : 'Não foi possível definir o livro atual.',
      'error'
    )
  }
}

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
        <p id="winner-description">Esse será o próximo livro do clube?</p>

        <div class="modal-actions">
          <button
            ref="acceptButton"
            class="primary-action"
            type="button"
            :disabled="raffleStore.isAccepting"
            @click="acceptWinner"
          >
            {{ raffleStore.isAccepting ? 'Definindo...' : 'Aceitar' }}
          </button>
          <button
            class="secondary-action"
            type="button"
            :disabled="raffleStore.isAccepting"
            @click="raffleStore.reroll"
          >
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
