import { describe, expect, it } from 'vitest'
import { averageRating, formatRating, isValidRating, normalizeRating, roundRating } from './rating'

describe('nota do capítulo/livro (domínio)', () => {
  it('aceita apenas notas finitas de 1 a 5', () => {
    expect(isValidRating(1)).toBe(true)
    expect(isValidRating(5)).toBe(true)
    expect(isValidRating(3.5)).toBe(true)
    expect(isValidRating(0)).toBe(false)
    expect(isValidRating(5.1)).toBe(false)
    expect(isValidRating(Number.NaN)).toBe(false)
    expect(isValidRating('4' as unknown)).toBe(false)
  })

  it('arredonda para uma casa decimal ao normalizar', () => {
    expect(roundRating(4.85)).toBe(4.9)
    expect(normalizeRating(4.84)).toBe(4.8)
    expect(normalizeRating('3.2')).toBe(3.2)
  })

  it('normaliza para null quando a nota está fora da faixa ou não é número', () => {
    expect(normalizeRating(0)).toBe(null)
    expect(normalizeRating(6)).toBe(null)
    expect(normalizeRating('abc')).toBe(null)
    expect(normalizeRating(undefined)).toBe(null)
  })

  it('formata em pt-BR com uma casa decimal', () => {
    expect(formatRating(4.8)).toBe('4,8')
    expect(formatRating(5)).toBe('5,0')
  })

  it('média é null sem avaliações e a soma dividida quando há', () => {
    expect(averageRating([])).toBe(null)
    expect(averageRating([4, 5])).toBe(4.5)
    expect(averageRating([5])).toBe(5)
  })
})
