import { describe, expect, it } from 'vitest'
import { countReactionTypes, REACTION_TYPES, isValidReactionType } from './reactions'

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

describe('contagem de reações', () => {
  it('conta por tipo, aceitando lista de objetos ou de strings', () => {
    expect(countReactionTypes([{ type: 'GOSTEI' }, { type: 'GOSTEI' }, { type: 'SOFRI' }])).toEqual({
      GOSTEI: 2,
      SOFRI: 1
    })
    expect(countReactionTypes(['SURPRESO', 'SURPRESO'])).toEqual({ SURPRESO: 2 })
  })

  it('omite tipo sem reação e ignora tipo desconhecido', () => {
    expect(countReactionTypes([{ type: 'GOSTEI' }, { type: 'INVENTADO' }])).toEqual({ GOSTEI: 1 })
    expect(countReactionTypes([])).toEqual({})
  })
})
