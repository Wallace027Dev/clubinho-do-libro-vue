import { describe, expect, it } from 'vitest'
import { REACTION_TYPES, isValidReactionType } from './reactions'

describe('tipos de reação (domínio)', () => {
  it('aceita as reações do clube', () => {
    for (const type of REACTION_TYPES) {
      expect(isValidReactionType(type)).toBe(true)
    }
  })

  it('rejeita valores fora da lista', () => {
    expect(isValidReactionType('AMEI')).toBe(false)
    expect(isValidReactionType('')).toBe(false)
    expect(isValidReactionType(undefined)).toBe(false)
    expect(isValidReactionType(1)).toBe(false)
  })
})
