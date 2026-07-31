<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import BookCover from './ui/BookCover.vue'
import { MAX_GENERATED_CHAPTERS } from '../domain/chapterStructure'
import { ApiError } from '../services/apiClient'
import { useRaffleStore } from '../stores/raffleStore'
import { useUiStore } from '../stores/uiStore'
import { formatBookMeta } from '../utils/bookMeta'

const raffleStore = useRaffleStore()
const uiStore = useUiStore()
const acceptButton = ref<HTMLButtonElement | null>(null)

// `input[type=number]` com v-model já entrega número; vazio vem como ''.
const chapterCountInput = ref<number | string>('')

/** `null` = campo vazio (permitido: cadastra os capítulos depois, no painel). */
const chapterCount = computed<number | null>(() => {
  const raw =
    typeof chapterCountInput.value === 'string'
      ? chapterCountInput.value.trim()
      : chapterCountInput.value

  if (raw === '') {
    return null
  }

  const value = Number(raw)
  return Number.isFinite(value) ? value : Number.NaN
})

const isCountValid = computed(() => {
  const count = chapterCount.value

  if (count === null) {
    return true
  }

  return Number.isInteger(count) && count >= 1 && count <= MAX_GENERATED_CHAPTERS
})

const countHint = computed(() => {
  if (!isCountValid.value) {
    return `Informe de 1 a ${MAX_GENERATED_CHAPTERS} capítulos.`
  }

  if (chapterCount.value === null) {
    return 'Sem capítulos agora — você cadastra depois no painel.'
  }

  return `Serão criados ${chapterCount.value} capítulos, que você nomeia depois.`
})

// Aceitar grava o livro atual no servidor: pode falhar (ex.: 409 se outro admin
// já definiu um livro), então o erro precisa aparecer para quem clicou.
async function acceptWinner() {
  if (!isCountValid.value) {
    return
  }

  try {
    await raffleStore.acceptWinner(chapterCount.value ?? undefined)
    uiStore.notify('Livro atual definido! O sorteio libera quando ele for concluído.')
    chapterCountInput.value = ''
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

        <div class="winner-book">
          <BookCover
            :title="raffleStore.selectedBook.title"
            :cover-url="raffleStore.selectedBook.coverUrl"
          />
          <div class="winner-book-info">
            <h2 id="winner-title" class="book-title-with-color">
              <span
                class="book-color-dot"
                :style="{ backgroundColor: raffleStore.selectedBook.color }"
                aria-hidden="true"
              ></span>
              {{ raffleStore.selectedBook.title }}
            </h2>
            <p v-if="formatBookMeta(raffleStore.selectedBook)" class="winner-book-meta">
              {{ formatBookMeta(raffleStore.selectedBook) }}
            </p>
          </div>
        </div>

        <p id="winner-description">Esse será o próximo livro do clube?</p>

        <div class="book-form">
          <label for="winner-chapter-count">Quantos capítulos o livro tem?</label>
          <input
            id="winner-chapter-count"
            v-model="chapterCountInput"
            type="number"
            inputmode="numeric"
            min="1"
            :max="MAX_GENERATED_CHAPTERS"
            placeholder="Ex.: 23"
            :aria-invalid="!isCountValid"
            aria-describedby="winner-chapter-hint"
          />
          <p id="winner-chapter-hint" :class="isCountValid ? 'comment-muted' : 'form-error'">
            {{ countHint }}
          </p>
        </div>

        <div class="modal-actions">
          <button
            ref="acceptButton"
            class="primary-action"
            type="button"
            :disabled="raffleStore.isAccepting || !isCountValid"
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
