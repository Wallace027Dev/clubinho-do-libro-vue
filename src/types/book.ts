import type { ExternalBookSource } from '../domain/bookSearch'

export type FlowStep = 'entry' | 'confirm' | 'roulette'

export interface Book {
  id: string
  title: string
  color: string
  createdAt: string
  /**
   * Metadados do livro escolhido na busca. Todos opcionais: candidato salvo
   * antes desta feature (o `localStorage` é lido sem validar) e candidato
   * adicionado à mão não têm nenhum deles.
   */
  author?: string | null
  publisher?: string | null
  pageCount?: number | null
  pageCountApproximate?: boolean
  coverUrl?: string | null
  description?: string | null
  source?: ExternalBookSource
  providerId?: string
}

export interface PersistedRaffleState {
  books: Book[]
  step: FlowStep
  wheelRotation: number
}
