import { describe, expect, it } from 'vitest'
import { canRaffle, resolveRaffleLock } from './raffle'

const liberado = { clubStateLoaded: true, hasCurrentBook: false, candidateCount: 2 }

describe('liberação do sorteio', () => {
  it('libera quando não há livro em andamento e há candidatos suficientes', () => {
    expect(resolveRaffleLock(liberado)).toBeNull()
    expect(canRaffle(liberado)).toBe(true)
  })

  it('trava enquanto existe livro atual em andamento', () => {
    expect(resolveRaffleLock({ ...liberado, hasCurrentBook: true })).toBe('current-book-in-progress')
    expect(canRaffle({ ...liberado, hasCurrentBook: true })).toBe(false)
  })

  it('libera assim que o livro atual é concluído, mesmo no meio do mês', () => {
    // Concluir zera `hasCurrentBook`; não existe mais trava por mês-calendário.
    expect(canRaffle({ ...liberado, hasCurrentBook: false })).toBe(true)
  })

  it('trava com menos de dois candidatos', () => {
    expect(resolveRaffleLock({ ...liberado, candidateCount: 1 })).toBe('not-enough-candidates')
    expect(resolveRaffleLock({ ...liberado, candidateCount: 0 })).toBe('not-enough-candidates')
  })

  it('trava enquanto o estado do clube não foi carregado', () => {
    // Fail-closed: sem saber se há livro em andamento, não deixa sortear.
    expect(resolveRaffleLock({ ...liberado, clubStateLoaded: false })).toBe('club-state-unknown')
  })

  it('livro em andamento tem precedência sobre falta de candidatos', () => {
    expect(
      resolveRaffleLock({ clubStateLoaded: true, hasCurrentBook: true, candidateCount: 0 })
    ).toBe('current-book-in-progress')
  })
})
