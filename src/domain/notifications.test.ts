import { describe, expect, it } from 'vitest'
import {
  activeMemberIds,
  activityUrl,
  bookFinishedNotification,
  chapterCommentNotification,
  chapterFinishedNotification,
  commentReactionNotification,
  excludeUser
} from './notifications'

describe('activeMemberIds (alvo das notificações)', () => {
  const members = [
    { id: 'u1', deactivatedAt: null },
    { id: 'u2', deactivatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'u3', deactivatedAt: null }
  ]

  it('inclui só membros ativos', () => {
    expect(activeMemberIds(members)).toEqual(['u1', 'u3'])
  })

  it('exclui quem disparou o evento', () => {
    expect(activeMemberIds(members, 'u1')).toEqual(['u3'])
  })
})

describe('excludeUser', () => {
  it('remove o autor da lista de alvos', () => {
    expect(excludeUser(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
    expect(excludeUser(['a', 'b'])).toEqual(['a', 'b'])
  })
})

describe('rota da interação', () => {
  it('aponta para a atividade quando ela foi resolvida', () => {
    expect(activityUrl('act-1', '/feed')).toBe('/activity/act-1')
  })

  it('cai no fallback sem atividade', () => {
    expect(activityUrl(null, '/feed')).toBe('/feed')
    expect(activityUrl(undefined, '/chapters')).toBe('/chapters')
  })
})

describe('conteúdo das notificações', () => {
  it('capítulo concluído leva à atividade da conclusão', () => {
    const payload = chapterFinishedNotification('João', 'o capítulo 3', 'act-fin')
    expect(payload.body).toBe('João terminou o capítulo 3.')
    expect(payload.url).toBe('/activity/act-fin')
    expect(payload.tag).toBe('chapter-finished')
  })

  it('capítulo concluído sem atividade resolvida cai no feed', () => {
    expect(chapterFinishedNotification('João', 'o capítulo 3').url).toBe('/feed')
  })

  it('livro finalizado', () => {
    const payload = bookFinishedNotification('Mistborn')
    expect(payload.body).toContain('Mistborn')
    expect(payload.url).toBe('/history')
    expect(payload.tag).toBe('book-finished')
  })

  it('novo comentário leva à página do comentário', () => {
    const payload = chapterCommentNotification('Maria', 'o prólogo', 'act-cm')
    expect(payload.body).toBe('Maria comentou o prólogo.')
    expect(payload.url).toBe('/activity/act-cm')
    expect(payload.tag).toBe('chapter-comment')
  })

  it('reação no seu comentário', () => {
    const payload = commentReactionNotification('Maria', 'o capítulo 3', 'cm-1', 'act-cm')
    expect(payload.body).toBe('Maria reagiu ao seu comentário sobre o capítulo 3.')
    expect(payload.url).toBe('/activity/act-cm')
    // Tag por comentário: reação em comentários diferentes não se substitui.
    expect(payload.tag).toBe('comment-reaction:cm-1')
  })
})
