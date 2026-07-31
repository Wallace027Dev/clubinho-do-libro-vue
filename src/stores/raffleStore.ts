import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { canRaffle, resolveRaffleLock } from '../domain/raffle'
import {
  calculateWinnerRotation,
  getRandomRgbColor,
  getRandomIndex,
  getSpinDurationMs,
  vibrate
} from '../services/raffleService'
import { loadRaffleState, saveRaffleState } from '../services/storageService'
import type { Book, FlowStep, PersistedRaffleState } from '../types/book'
import { usePlatformStore } from './platformStore'

function createBook(title: string): Book {
  const id = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

  return {
    id,
    title,
    color: getRandomRgbColor(),
    createdAt: new Date().toISOString()
  }
}

export const useRaffleStore = defineStore('raffle', () => {
  const platformStore = usePlatformStore()

  const persistedState = loadRaffleState()
  const books = ref<Book[]>((persistedState?.books ?? []).map(ensureBookColor))
  const step = ref<FlowStep>(persistedState?.step ?? 'entry')
  const selectedBook = ref<Book | null>(null)
  const wheelRotation = ref(persistedState?.wheelRotation ?? 0)
  const isSpinning = ref(false)
  const isAccepting = ref(false)
  const isWinnerModalOpen = ref(false)

  // A trava do sorteio é derivada do estado do clube no servidor (livro atual),
  // não de estado local: o admin pode concluir o livro em outro aparelho.
  const raffleGate = computed(() => ({
    clubStateLoaded: platformStore.hasLoadedClubState,
    hasCurrentBook: platformStore.clubState.currentBook !== null,
    candidateCount: books.value.length
  }))

  const raffleLock = computed(() => resolveRaffleLock(raffleGate.value))
  const canConfirmBooks = computed(() => canRaffle(raffleGate.value))
  const canSpin = computed(() => canRaffle(raffleGate.value) && !isSpinning.value)

  function ensureBookColor(book: Book): Book {
    return {
      ...book,
      color: book.color ?? getRandomRgbColor()
    }
  }

  function persist() {
    const state: PersistedRaffleState = {
      books: books.value,
      step: step.value,
      wheelRotation: wheelRotation.value
    }

    saveRaffleState(state)
  }

  function addBook(title: string) {
    const normalizedTitle = title.trim().replace(/\s+/g, ' ')

    if (!normalizedTitle) {
      return
    }

    books.value.push(createBook(normalizedTitle))
    persist()
  }

  function removeBook(bookId: string) {
    books.value = books.value.filter((book) => book.id !== bookId)
    persist()
  }

  function confirmBooks() {
    if (!canConfirmBooks.value) {
      return
    }

    step.value = 'roulette'
    persist()
  }

  function editBooks() {
    step.value = 'entry'
    isWinnerModalOpen.value = false
    selectedBook.value = null
    persist()
  }

  function resetCurrentRaffle() {
    books.value = []
    step.value = 'entry'
    selectedBook.value = null
    isWinnerModalOpen.value = false
    wheelRotation.value = 0
    persist()
  }

  function spin() {
    if (!canSpin.value) {
      return
    }

    const winnerIndex = getRandomIndex(books.value.length)
    const winner = books.value[winnerIndex]

    selectedBook.value = winner
    isWinnerModalOpen.value = false
    isSpinning.value = true
    wheelRotation.value = calculateWinnerRotation(winnerIndex, books.value.length, wheelRotation.value)
    vibrate(15)
    persist()

    window.setTimeout(() => {
      isSpinning.value = false
      isWinnerModalOpen.value = true
      vibrate([20, 40, 20])
    }, getSpinDurationMs())
  }

  function closeWinnerModal() {
    isWinnerModalOpen.value = false
  }

  /**
   * Aceitar o vencedor define o **livro atual do clube** (servidor). Não existe
   * mais um "livro do mês" guardado em localStorage: o livro atual é a fonte
   * única, e é ele que trava o próximo sorteio até ser concluído.
   */
  async function acceptWinner() {
    const winner = selectedBook.value

    if (!winner || isAccepting.value) {
      return
    }

    isAccepting.value = true

    try {
      await platformStore.selectCurrentBook(winner.title, '', '')

      // O vencedor virou o livro do clube: sai da lista de candidatos para não
      // concorrer no próximo sorteio. Os demais continuam na fila.
      books.value = books.value.filter((book) => book.id !== winner.id)
      step.value = 'entry'
      selectedBook.value = null
      isWinnerModalOpen.value = false
      wheelRotation.value = 0
      vibrate(30)
      persist()
    } finally {
      isAccepting.value = false
    }
  }

  function reroll() {
    if (!canRaffle(raffleGate.value)) {
      isWinnerModalOpen.value = false
      return
    }

    isWinnerModalOpen.value = false
    spin()
  }

  return {
    books,
    step,
    selectedBook,
    wheelRotation,
    isSpinning,
    isAccepting,
    isWinnerModalOpen,
    raffleLock,
    canConfirmBooks,
    canSpin,
    addBook,
    removeBook,
    confirmBooks,
    editBooks,
    resetCurrentRaffle,
    spin,
    closeWinnerModal,
    acceptWinner,
    reroll
  }
})
