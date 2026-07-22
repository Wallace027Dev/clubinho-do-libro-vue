import { describe, expect, it } from 'vitest'
import { formatMonthYear, formatRating } from './format'

describe('formatRating', () => {
  it('usa vírgula decimal e uma casa (pt-BR)', () => {
    expect(formatRating(4.8)).toBe('4,8')
    expect(formatRating(3)).toBe('3,0')
    expect(formatRating(1)).toBe('1,0')
  })
})

describe('formatMonthYear', () => {
  it('devolve mês/ano capitalizado', () => {
    expect(formatMonthYear('2026-07-15')).toBe('Julho de 2026')
  })

  it('usa o fallback quando não há data', () => {
    expect(formatMonthYear(null)).toBe('Finalizado')
    expect(formatMonthYear(undefined, 'Sem data')).toBe('Sem data')
  })
})
