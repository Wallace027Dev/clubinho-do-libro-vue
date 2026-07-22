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
    expect(reactionEmoji('GOSTEI')).toBe('🙂')
    expect(reactionLabel('SOFRI')).toBe('sofri')
    expect(reactionLabel('DISCUTIR')).toBe('discutir')
  })

  it('tem fallback para tipo desconhecido', () => {
    const unknown = 'INEXISTENTE' as ChapterCommentReactionType
    expect(reactionEmoji(unknown)).toBe('🙂')
    expect(reactionLabel(unknown)).toBe('reação')
  })
})
