import { describe, expect, it } from 'vitest'
import { activityChannel, isAlertActivity, isFeedActivity } from './activities'

describe('canais de atividade', () => {
  it('comentário vai para o feed (página /feed)', () => {
    expect(activityChannel('CHAPTER_COMMENTED')).toBe('feed')
    expect(isFeedActivity('CHAPTER_COMMENTED')).toBe(true)
    expect(isAlertActivity('CHAPTER_COMMENTED')).toBe(false)
  })

  it('progresso e marcos vão para o sininho (alerta)', () => {
    for (const type of [
      'CHAPTER_STARTED',
      'CHAPTER_FINISHED',
      'BOOK_SELECTED',
      'BOOK_FINISHED',
      'BOOK_REVIEWED',
      'MEMBER_CREATED'
    ]) {
      expect(activityChannel(type)).toBe('alert')
      expect(isAlertActivity(type)).toBe(true)
      expect(isFeedActivity(type)).toBe(false)
    }
  })

  it('atualização de perfil fica oculta', () => {
    expect(activityChannel('PROFILE_UPDATED')).toBe('hidden')
    expect(isFeedActivity('PROFILE_UPDATED')).toBe(false)
    expect(isAlertActivity('PROFILE_UPDATED')).toBe(false)
  })
})
