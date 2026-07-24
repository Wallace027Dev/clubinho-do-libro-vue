import { describe, expect, it } from 'vitest'
import { activityChannel, isBellActivity, isFeedActivity } from './activities'

describe('canais de atividade', () => {
  it('comentário vai para o sininho (acionável)', () => {
    expect(activityChannel('CHAPTER_COMMENTED')).toBe('bell')
    expect(isBellActivity('CHAPTER_COMMENTED')).toBe(true)
  })

  it('ruído fica oculto: "iniciou capítulo" e atualização de perfil', () => {
    for (const type of ['CHAPTER_STARTED', 'PROFILE_UPDATED']) {
      expect(activityChannel(type)).toBe('hidden')
      expect(isFeedActivity(type)).toBe(false)
      expect(isBellActivity(type)).toBe(false)
    }
  })

  it('progresso e marcos do clube ficam no feed', () => {
    for (const type of ['CHAPTER_FINISHED', 'BOOK_SELECTED', 'BOOK_FINISHED', 'BOOK_REVIEWED', 'MEMBER_CREATED']) {
      expect(activityChannel(type)).toBe('feed')
      expect(isFeedActivity(type)).toBe(true)
    }
  })
})
