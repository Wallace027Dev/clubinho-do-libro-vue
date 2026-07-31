/**
 * Regra do sorteio do próximo livro.
 *
 * A roleta só libera quando o clube **não** tem livro atual em andamento: quem
 * reabre o sorteio é o admin **concluindo** o livro atual — não a virada do mês.
 *
 * Contraparte no servidor: `resolveSelectBook` recusa com 409 quando já existe
 * livro atual (`services/adminBook.ts`). Aqui é o mesmo invariante aplicado
 * antes da tentativa, para travar a UI; o servidor continua sendo a autoridade.
 */

/** Mínimo de candidatos para montar a roleta. */
export const MIN_RAFFLE_CANDIDATES = 2

export type RaffleLock =
  /** Estado do clube ainda não carregado: trava por precaução (fail-closed). */
  | 'club-state-unknown'
  /** Existe livro atual em andamento; concluí-lo libera o sorteio. */
  | 'current-book-in-progress'
  /** Menos candidatos do que `MIN_RAFFLE_CANDIDATES`. */
  | 'not-enough-candidates'

export interface RaffleGateInput {
  /** Se o estado do clube já foi carregado do servidor. */
  clubStateLoaded: boolean
  /** Se existe livro atual em andamento no clube. */
  hasCurrentBook: boolean
  /** Quantos candidatos estão cadastrados na roleta. */
  candidateCount: number
}

/** Motivo pelo qual o sorteio está travado, ou `null` se está liberado. */
export function resolveRaffleLock(input: RaffleGateInput): RaffleLock | null {
  if (!input.clubStateLoaded) {
    return 'club-state-unknown'
  }

  if (input.hasCurrentBook) {
    return 'current-book-in-progress'
  }

  if (input.candidateCount < MIN_RAFFLE_CANDIDATES) {
    return 'not-enough-candidates'
  }

  return null
}

export function canRaffle(input: RaffleGateInput): boolean {
  return resolveRaffleLock(input) === null
}
