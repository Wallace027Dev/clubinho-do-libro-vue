export type FlowStep = 'entry' | 'confirm' | 'roulette'

export interface Book {
  id: string
  title: string
  color: string
  createdAt: string
}

export interface MonthlyBook {
  month: string
  book: Book
  acceptedAt: string
}

export interface PersistedRaffleState {
  books: Book[]
  step: FlowStep
  monthlyBook: MonthlyBook | null
  wheelRotation: number
}
