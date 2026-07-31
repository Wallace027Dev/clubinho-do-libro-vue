import { describe, expect, it } from 'vitest'
import { reactionEmoji, reactionLabel, reactionOptions } from './reactions'
import type { ChapterCommentReactionType } from '../types/platform'

describe('reactions', () => {
  it('expõe as cinco reações na ordem esperada', () => {
    expect(reactionOptions.map((option) => option.type)).toEqual([
      'GOSTEI',
      'SOFRI',
      'SURPRESO',
      'SUSPEITO',
      'DISCUTIR'
    ])
  })

  it('mapeia emoji e rótulo por tipo', () => {
    // Tipos são o enum do banco; emoji e rótulo são só apresentação.
    expect(reactionEmoji('GOSTEI')).toBe('❤️')
    expect(reactionLabel('GOSTEI')).toBe('amei')
    expect(reactionEmoji('SOFRI')).toBe('😂')
    expect(reactionLabel('SOFRI')).toBe('engraçado')
    expect(reactionEmoji('SUSPEITO')).toBe('😢')
    expect(reactionLabel('SUSPEITO')).toBe('triste')
    expect(reactionEmoji('DISCUTIR')).toBe('😡')
    expect(reactionLabel('DISCUTIR')).toBe('revoltado')
  })

  it('tem fallback para tipo desconhecido', () => {
    const unknown = 'INEXISTENTE' as ChapterCommentReactionType
    expect(reactionEmoji(unknown)).toBe('❤️')
    expect(reactionLabel(unknown)).toBe('reação')
  })
})
