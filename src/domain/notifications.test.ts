import { describe, expect, it } from 'vitest'
import {
  activeMemberIds,
  bookFinishedNotification,
  bookSelectedNotification,
  chapterCommentNotification,
  chapterFinishedNotification,
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

describe('conteúdo das notificações', () => {
  it('novo livro do mês', () => {
    const payload = bookSelectedNotification('Mistborn')
    expect(payload.body).toContain('Mistborn')
    expect(payload.url).toBe('/')
    expect(payload.tag).toBe('book-selected')
  })

  it('capítulo concluído', () => {
    const payload = chapterFinishedNotification('João', 'o capítulo 3')
    expect(payload.body).toBe('João terminou o capítulo 3.')
    expect(payload.tag).toBe('chapter-finished')
  })

  it('livro finalizado', () => {
    const payload = bookFinishedNotification('Mistborn')
    expect(payload.body).toContain('Mistborn')
    expect(payload.url).toBe('/history')
    expect(payload.tag).toBe('book-finished')
  })

  it('novo comentário', () => {
    const payload = chapterCommentNotification('Maria', 'o prólogo')
    expect(payload.body).toBe('Maria comentou o prólogo.')
    expect(payload.tag).toBe('chapter-comment')
  })
})
