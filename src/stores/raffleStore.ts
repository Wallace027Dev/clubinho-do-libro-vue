import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  calculateWinnerRotation,
  getCurrentMonthKey,
  getNextMonthLabel,
  getRandomRgbColor,
  getRandomIndex,
  getSpinDurationMs,
  vibrate
} from '../services/raffleService'
import { loadRaffleState, saveRaffleState } from '../services/storageService'
import type { Book, FlowStep, MonthlyBook, PersistedRaffleState } from '../types/book'

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
  const persistedState = loadRaffleState()
  const books = ref<Book[]>((persistedState?.books ?? []).map(ensureBookColor))
  const step = ref<FlowStep>(persistedState?.step ?? 'entry')
  const monthlyBook = ref<MonthlyBook | null>(ensureMonthlyBookColor(persistedState?.monthlyBook ?? null))
  const selectedBook = ref<Book | null>(null)
  const wheelRotation = ref(persistedState?.wheelRotation ?? 0)
  const isSpinning = ref(false)
  const isWinnerModalOpen = ref(false)
  const currentDate = ref(new Date())

  window.setInterval(() => {
    currentDate.value = new Date()
  }, 60 * 60 * 1000)

  const currentMonthKey = computed(() => getCurrentMonthKey(currentDate.value))
  const nextRaffleMonthLabel = computed(() => getNextMonthLabel(currentDate.value))
  const hasCurrentMonthBook = computed(() => monthlyBook.value?.month === currentMonthKey.value)
  const canConfirmBooks = computed(() => books.value.length >= 2 && !hasCurrentMonthBook.value)
  const canSpin = computed(() => books.value.length >= 2 && !isSpinning.value && !hasCurrentMonthBook.value)

  function ensureBookColor(book: Book): Book {
    return {
      ...book,
      color: book.color ?? getRandomRgbColor()
    }
  }

  function ensureMonthlyBookColor(bookOfMonth: MonthlyBook | null): MonthlyBook | null {
    if (!bookOfMonth) {
      return null
    }

    return {
      ...bookOfMonth,
      book: ensureBookColor(bookOfMonth.book)
    }
  }

  function persist() {
    const state: PersistedRaffleState = {
      books: books.value,
      step: step.value,
      monthlyBook: monthlyBook.value,
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

  function clearMonthlyBook() {
    monthlyBook.value = null
    step.value = 'entry'
    isWinnerModalOpen.value = false
    selectedBook.value = null
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

  function acceptWinner() {
    if (!selectedBook.value) {
      return
    }

    monthlyBook.value = {
      month: getCurrentMonthKey(),
      book: selectedBook.value,
      acceptedAt: new Date().toISOString()
    }

    step.value = 'entry'
    isWinnerModalOpen.value = false
    vibrate(30)
    persist()
  }

  function reroll() {
    if (hasCurrentMonthBook.value) {
      isWinnerModalOpen.value = false
      return
    }

    isWinnerModalOpen.value = false
    spin()
  }

  return {
    books,
    step,
    monthlyBook,
    selectedBook,
    wheelRotation,
    isSpinning,
    isWinnerModalOpen,
    hasCurrentMonthBook,
    nextRaffleMonthLabel,
    canConfirmBooks,
    canSpin,
    addBook,
    removeBook,
    confirmBooks,
    editBooks,
    resetCurrentRaffle,
    clearMonthlyBook,
    spin,
    closeWinnerModal,
    acceptWinner,
    reroll
  }
})
