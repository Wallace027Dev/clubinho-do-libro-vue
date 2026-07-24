/**
 * Camada de domínio — nota (rating) de capítulo/livro.
 *
 * Fonte única das regras de nota, consumida pelo backend real (`api/`) e pelo
 * mock de homologação (`src/services/mockApi/`). Funções puras, sem I/O: são a
 * "verdade" do negócio e a base dos testes unitários.
 */

/** Menor e maior nota aceitas pelo clube. */
export const MIN_RATING = 1
export const MAX_RATING = 5

/**
 * Arredonda a nota para uma casa decimal (regra de armazenamento: 4.85 -> 4.9).
 * Não valida faixa — use com `isValidRating`/`normalizeRating`.
 */
export function roundRating(value: number): number {
  return Math.round(value * 10) / 10
}

/** Uma nota é válida quando é finita e está no intervalo fechado [1, 5]. */
export function isValidRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_RATING && value <= MAX_RATING
}

/**
 * Normaliza uma nota vinda da borda (corpo da requisição): converte para
 * número, arredonda para uma casa e valida a faixa. Devolve a nota pronta para
 * salvar ou `null` quando o valor é inválido (o chamador responde 400).
 */
export function normalizeRating(raw: unknown): number | null {
  const rounded = roundRating(Number(raw))
  return isValidRating(rounded) ? rounded : null
}

/** Formata a nota em pt-BR com uma casa decimal: 4.8 -> "4,8". */
export function formatRating(value: number): string {
  return value.toFixed(1).replace('.', ',')
}

/**
 * Média das notas de uma lista de avaliações. Sem avaliações, a média é `null`
 * (não 0) — "ainda não avaliado" é diferente de "nota zero".
 */
export function averageRating(ratings: readonly number[]): number | null {
  if (ratings.length === 0) {
    return null
  }

  return ratings.reduce((sum, value) => sum + value, 0) / ratings.length
}
